import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { registerAdmin, loginUser, parentLogin } from '../controllers/authController';
import {
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher,
  uploadStudents,
  getStudents,
  deleteStudent,
  deleteResult,
  toggleResultApproval,
  updateAdminProfile,
  getResults,
  getAdminProfile,
  sendNotification,
  getAllNotifications,
  deleteNotification,
  getNotificationsForRole,
  getPublicNotifications,
} from '../controllers/adminController';
import {
  getStudentsForTeacher,
  submitOrUpdateResult,
  getStudentResults,
  getResultById,
  getParentStudentResults,
} from '../controllers/gradeController';
import { generateResultPdf } from '../controllers/pdfController';
import { SURAHS } from '../utils/surahs';

const router = Router();

// --- Public Routes ---
router.post('/auth/register-admin', registerAdmin);
router.post('/auth/login-staff', loginUser);
router.post('/auth/login-parent', parentLogin);
router.get('/public/notifications', getPublicNotifications);
router.get('/surahs', (req, res) => {
  return res.status(200).json(SURAHS);
});

// --- Admin Only Routes ---
router.post('/admin/teachers', authenticateToken, requireRole(['ADMIN']), createTeacher);
router.get('/admin/teachers', authenticateToken, requireRole(['ADMIN']), getTeachers);
router.put('/admin/teachers/:id', authenticateToken, requireRole(['ADMIN']), updateTeacher);
router.delete('/admin/teachers/:id', authenticateToken, requireRole(['ADMIN']), deleteTeacher);
router.put('/admin/profile', authenticateToken, requireRole(['ADMIN']), updateAdminProfile);
router.get('/admin/profile', authenticateToken, requireRole(['ADMIN']), getAdminProfile);
router.get('/admin/results', authenticateToken, requireRole(['ADMIN']), getResults);

router.post('/admin/students/upload', authenticateToken, requireRole(['ADMIN']), uploadStudents);
router.get('/admin/students', authenticateToken, requireRole(['ADMIN']), getStudents);
router.delete('/admin/students/:id', authenticateToken, requireRole(['ADMIN']), deleteStudent);

router.delete('/admin/results/:id', authenticateToken, requireRole(['ADMIN']), deleteResult);
router.patch('/admin/results/:id/status', authenticateToken, requireRole(['ADMIN']), toggleResultApproval);

// --- Teacher/Admin Routes ---
router.get('/teacher/students', authenticateToken, requireRole(['ADMIN', 'TEACHER']), getStudentsForTeacher);
router.post('/grading/submit', authenticateToken, requireRole(['ADMIN', 'TEACHER']), submitOrUpdateResult);
router.get('/grading/student/:studentId', authenticateToken, requireRole(['ADMIN', 'TEACHER']), getStudentResults);

// --- Secure PDF and Result Views (Shared Roles) ---
router.get('/results/:id', authenticateToken, getResultById);
router.get('/results/:id/pdf', authenticateToken, generateResultPdf);

// --- Parent Portal Routes ---
router.get('/parent/results', authenticateToken, requireRole(['PARENT']), getParentStudentResults);

// --- Notification Routes ---
// Admin: send, list, delete
router.post('/admin/notifications', authenticateToken, requireRole(['ADMIN']), sendNotification);
router.get('/admin/notifications', authenticateToken, requireRole(['ADMIN']), getAllNotifications);
router.delete('/admin/notifications/:id', authenticateToken, requireRole(['ADMIN']), deleteNotification);

// Teacher and Parent: get their notifications
router.get('/notifications', authenticateToken, requireRole(['TEACHER', 'PARENT', 'ADMIN']), getNotificationsForRole);

export default router;
