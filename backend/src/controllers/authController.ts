import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Student from '../models/Student';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL ERROR: JWT_SECRET environment variable is not defined.');
  }
  return secret;
};

// Admin Registration (Initial setup within a tenant)
export const registerAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, name } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Bootstrap lock: block registration if an admin already exists for this tenant
    const adminExists = await User.findOne({ tenantId, role: 'ADMIN' });
    if (adminExists) {
      return res.status(403).json({ message: 'Access denied: Admin registration is locked for this school.' });
    }

    const formattedUsername = username.trim().toLowerCase();
    const existingUser = await User.findOne({ tenantId, username: formattedUsername });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists for this school' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new User({
      tenantId,
      username: formattedUsername,
      password: hashedPassword,
      name,
      role: 'ADMIN',
    });

    await admin.save();
    return res.status(201).json({ message: 'Admin registered successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin & Teacher Login
export const loginUser = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required. Make sure you are using the correct school domain.' });
    }

    if (!username || !password) {
      return res.status(400).json({ message: 'Please enter username and password' });
    }

    const formattedUsername = username.trim().toLowerCase();
    const user: any = await User.findOne({ tenantId, username: formattedUsername });
    if (!user || !user.isActive) {
      return res.status(400).json({ message: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, tenantId: user.tenantId.toString() },
      getJwtSecret(),
      { expiresIn: '10h' } // Increased to 10 hours for convenient daily usage in school
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        assignedClasses: user.assignedClasses,
        classTeacherClasses: user.classTeacherClasses || [],
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Parent PIN-Based Login
export const parentLogin = async (req: AuthRequest, res: Response) => {
  try {
    const { admissionNumber, pin } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    if (!admissionNumber || !pin) {
      return res.status(400).json({ message: 'Please enter admission number and PIN' });
    }

    const formattedAdmissionNumber = admissionNumber.trim().toUpperCase();

    const student: any = await Student.findOne({ tenantId, admissionNumber: formattedAdmissionNumber, isDeleted: { $ne: true } });
    if (!student) {
      return res.status(404).json({ message: 'Student not found with this admission number' });
    }

    const isMatch = await student.comparePin(pin);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid PIN' });
    }

    const token = jwt.sign(
      {
        id: student._id,
        role: 'PARENT',
        admissionNumber: student.admissionNumber,
        name: student.name,
        tenantId: student.tenantId.toString(),
      },
      getJwtSecret(),
      { expiresIn: '12h' } // 12 hours session duration for parents
    );

    return res.status(200).json({
      token,
      student: {
        id: student._id,
        admissionNumber: student.admissionNumber,
        name: student.name,
        level: student.level,
        section: student.section,
        academicYear: student.academicYear,
        tenantId: student.tenantId,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// SaaS Platform Admin Login (no tenant context required)
export const platformLogin = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please enter username and password' });
    }

    const formattedUsername = username.trim().toLowerCase();
    // Find the user globally where role is SUPER_ADMIN
    const user = await User.findOne({ username: formattedUsername, role: 'SUPER_ADMIN' });
    if (!user || !user.isActive) {
      return res.status(400).json({ message: 'Invalid platform credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, tenantId: user.tenantId?.toString() || '' },
      getJwtSecret(),
      { expiresIn: '10h' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
