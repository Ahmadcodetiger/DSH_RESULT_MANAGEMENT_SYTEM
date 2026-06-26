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

// Admin Registration (Initial setup)
export const registerAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, name } = req.body;

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Bootstrap lock: block registration if an admin already exists in the database
    const adminExists = await User.findOne({ role: 'ADMIN' });
    if (adminExists) {
      return res.status(403).json({ message: 'Access denied: Admin registration is locked after the first admin is created.' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new User({
      username,
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

    if (!username || !password) {
      return res.status(400).json({ message: 'Please enter username and password' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      getJwtSecret(),
      { expiresIn: '8h' } // Reduced to 8 hours for staff
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        assignedClasses: user.assignedClasses,
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

    if (!admissionNumber || !pin) {
      return res.status(400).json({ message: 'Please enter admission number and PIN' });
    }

    const formattedAdmissionNumber = admissionNumber.trim().toUpperCase();

    const student: any = await Student.findOne({ admissionNumber: formattedAdmissionNumber, isDeleted: { $ne: true } });
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
      },
      getJwtSecret(),
      { expiresIn: '24h' } // Reduced to 24 hours for parents
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
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
