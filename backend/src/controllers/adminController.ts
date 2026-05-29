import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Student from '../models/Student';
import Result from '../models/Result';
import Notification from '../models/Notification';

// --- Teacher Management ---

// Create a new teacher
export const createTeacher = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, name, assignedClasses } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Missing required teacher fields' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const teacher = new User({
      username,
      password: hashedPassword,
      name,
      role: 'TEACHER',
      assignedClasses: assignedClasses || [],
    });

    await teacher.save();
    return res.status(201).json({ message: 'Teacher created successfully', teacher: { id: teacher._id, username, name } });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// List all teachers
export const getTeachers = async (req: AuthRequest, res: Response) => {
  try {
    const teachers = await User.find({ role: 'TEACHER' }).select('-password');
    return res.status(200).json(teachers);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update teacher (assigned classes, name, username, etc.)
export const updateTeacher = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username, name, assignedClasses, password } = req.body;

    const teacher = await User.findOne({ _id: id, role: 'TEACHER' });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (username) teacher.username = username;
    if (name) teacher.name = name;
    if (assignedClasses) teacher.assignedClasses = assignedClasses;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      teacher.password = await bcrypt.hash(password, salt);
    }

    await teacher.save();
    return res.status(200).json({ message: 'Teacher updated successfully', teacher });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete teacher
export const deleteTeacher = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const teacher = await User.findOneAndDelete({ _id: id, role: 'TEACHER' });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    return res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- Student Management ---

// Bulk upload students via JSON list
export const uploadStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { students } = req.body; // Expecting { students: Array<{ admissionNumber, name, level, section, academicYear, parentPin? }> }

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Invalid payload. Expecting a list of students' });
    }

    const createdStudents = [];
    const skippedStudents = [];

    for (const stud of students) {
      const { admissionNumber, name, level, section, academicYear, parentPin } = stud;

      if (!admissionNumber || !name || !level || !section || !academicYear) {
        skippedStudents.push({ ...stud, reason: 'Missing required fields' });
        continue;
      }

      const formattedAdmission = admissionNumber.trim().toUpperCase();
      const existing = await Student.findOne({ admissionNumber: formattedAdmission });
      if (existing) {
        skippedStudents.push({ ...stud, reason: 'Admission number already exists' });
        continue;
      }

      // If parent PIN is not provided, generate a random 4-digit number
      const generatedPin = parentPin || Math.floor(1000 + Math.random() * 9000).toString();

      const newStudent = new Student({
        admissionNumber: formattedAdmission,
        name,
        level,
        section,
        academicYear,
        parentPin: generatedPin, // Hashed in pre-save middleware
      });

      await newStudent.save();
      createdStudents.push({
        admissionNumber: formattedAdmission,
        name,
        level,
        section,
        academicYear,
        pin: generatedPin, // return plain text pin so Admin can print/share it
      });
    }

    return res.status(201).json({
      message: `Successfully uploaded ${createdStudents.length} students.`,
      uploaded: createdStudents,
      skipped: skippedStudents,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all students (with optional filters)
export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { level, section } = req.query;
    const filter: any = {};
    if (level) filter.level = level;
    if (section) filter.section = section;

    const students = await Student.find(filter).sort({ name: 1 });
    // Since parentPin is hashed in the database, we cannot return it.
    // If the admin wants to reset/edit, they submit a new one.
    return res.status(200).json(students);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete student (and their results)
export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    // Clean up their results
    await Result.deleteMany({ studentId: id });

    return res.status(200).json({ message: 'Student and related results deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- Result Management ---

// Delete a specific result
export const deleteResult = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await Result.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }
    return res.status(200).json({ message: 'Result deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle result approval status
export const toggleResultApproval = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await Result.findById(id);
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }
    
    // Toggle status
    result.status = result.status === 'approved' ? 'draft' : 'approved';
    await result.save();
    
    return res.status(200).json({ message: 'Result status updated', result });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Administrator Profile credentials
export const updateAdminProfile = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id; // attached by authenticateToken middleware
    if (!adminId) {
      return res.status(401).json({ message: 'Unauthorized: missing token user ID' });
    }

    const { username, name, password } = req.body;

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    if (username && username.trim() !== '') {
      const formattedUsername = username.trim().toLowerCase();
      // Ensure the new username isn't taken by someone else
      const existing = await User.findOne({ username: formattedUsername, _id: { $ne: adminId } });
      if (existing) {
        return res.status(400).json({ message: 'Username is already taken by another account' });
      }
      admin.username = formattedUsername;
    }

    if (name && name.trim() !== '') {
      admin.name = name.trim();
    }

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }

    await admin.save();
    return res.status(200).json({
      message: 'Admin profile updated successfully',
      user: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error updating admin profile', error: error.message });
  }
};

// Retrieve all results globally
export const getResults = async (req: AuthRequest, res: Response) => {
  try {
    const results = await Result.find({})
      .populate('studentId', 'name admissionNumber level section')
      .sort({ createdAt: -1 });
    return res.status(200).json(results);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching all results', error: error.message });
  }
};

// Retrieve administrator profile details
export const getAdminProfile = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const admin = await User.findById(adminId).select('-password');
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(404).json({ message: 'Admin not found' });
    }
    return res.status(200).json(admin);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error retrieving admin profile', error: error.message });
  }
};

// --- Notification Management ---

// Admin sends a notification to TEACHER, PARENT, or ALL
export const sendNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, targetRole } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const notification = new Notification({
      title,
      message,
      targetRole: targetRole || 'ALL',
      createdBy: req.user?.name || 'Admin',
    });

    await notification.save();
    console.log('[Notification] ✅ Sent:', title, '→', targetRole || 'ALL');
    return res.status(201).json({ message: 'Notification sent successfully', notification });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error sending notification', error: error.message });
  }
};

// Get all notifications (admin view – all of them)
export const getAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find({}).sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching notifications', error: error.message });
  }
};

// Delete a notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const n = await Notification.findByIdAndDelete(id);
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    return res.status(200).json({ message: 'Notification deleted' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error deleting notification', error: error.message });
  }
};

// Teacher/Parent fetches their notifications (filtered by role)
export const getNotificationsForRole = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role; // 'TEACHER' or 'PARENT'
    const notifications = await Notification.find({
      $or: [{ targetRole: role }, { targetRole: 'ALL' }],
    }).sort({ createdAt: -1 }).limit(30);
    return res.status(200).json(notifications);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching notifications', error: error.message });
  }
};

// Public: fetches notifications filtered by role (e.g. TEACHER, PARENT) or default to ALL
export const getPublicNotifications = async (req: any, res: Response) => {
  try {
    const role = req.query.role as string;
    const filter: any = {
      $or: [{ targetRole: 'ALL' }],
    };
    if (role && ['TEACHER', 'PARENT'].includes(role)) {
      filter.$or.push({ targetRole: role });
    }
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(30);
    return res.status(200).json(notifications);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching notifications', error: error.message });
  }
};
