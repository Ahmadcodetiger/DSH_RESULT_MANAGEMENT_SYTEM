import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import Result from '../models/Result';
import User from '../models/User';
import { computeResultMetrics } from '../utils/gradeCalculator';

// Fetch students assigned to teacher based on level and section
export const getStudentsForTeacher = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    let filter: any = {};

    if (req.user.role === 'TEACHER') {
      const teacher = await User.findById(req.user.id);
      if (!teacher || !teacher.assignedClasses || teacher.assignedClasses.length === 0) {
        return res.status(200).json([]); // No classes assigned
      }
      
      // Formulate OR query to match any assigned level + section
      const classOrFilters = teacher.assignedClasses.map((cls) => ({
        level: cls.level,
        section: cls.section,
      }));
      filter = { $or: classOrFilters, isDeleted: { $ne: true } };
    } else {
      // Admin filters (optional query params)
      const { level, section } = req.query;
      filter.isDeleted = { $ne: true };
      if (level) filter.level = level;
      if (section) filter.section = section;
    }

    const students = await Student.find(filter).select('-parentPin').sort({ name: 1 });
    
    // Add grading status for each student (e.g. check if they have results for the current academic year/term if query params are provided)
    const { academicYear, term } = req.query;
    if (academicYear && term) {
      const results = await Result.find({ academicYear, term });
      const resultMap = new Map(results.map(r => [r.studentId.toString(), r]));
      
      const studentsWithStatus = students.map(s => {
        const studentObj = s.toObject();
        return {
          ...studentObj,
          hasResult: resultMap.has(s._id.toString()),
          resultId: resultMap.has(s._id.toString()) ? resultMap.get(s._id.toString())?._id : null
        };
      });
      return res.status(200).json(studentsWithStatus);
    }

    return res.status(200).json(students);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create or update a student's result
export const submitOrUpdateResult = async (req: AuthRequest, res: Response) => {
  try {
    const {
      studentId,
      academicYear,
      term,
      subjects, // Array of SubjectInput: { subjectName, subjectNameArabic, score60, score20_1, score20_2, isGraded }
      tahfeezhDetails,
      evaluationElements,
      supervisorRecommendations,
      teacherRecommendations,
      headTeacherComments,
      dateIssued,
      nextTermBegins
    } = req.body;

    if (!studentId || !academicYear || !term || !subjects) {
      return res.status(400).json({ message: 'Missing required grading fields' });
    }

    const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Teacher scope check: Verify teacher assignment before allowing write
    if (req.user?.role === 'TEACHER') {
      const teacher = await User.findById(req.user.id);
      if (!teacher) {
        return res.status(403).json({ message: 'Teacher account not found' });
      }
      const hasAccess = teacher.assignedClasses?.some(
        (cls) => cls.level === student.level && cls.section === student.section
      );
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this student\'s class.' });
      }
    }

    // Run auto-grading engine
    const computed = computeResultMetrics(subjects);

    // Get current teacher/admin name
    const teacherName = req.user?.name || 'Unknown Teacher';

    // Find and update or create
    const query = { studentId, academicYear, term };
    const updateData = {
      level: student.level,
      section: student.section,
      subjects: computed.subjects,
      tahfeezhDetails: tahfeezhDetails || {},
      evaluationElements: evaluationElements || [],
      totalMark: computed.totalMark,
      finalAverage: computed.finalAverage,
      generalGrade: computed.generalGrade,
      supervisorRecommendations: supervisorRecommendations || '',
      teacherRecommendations: teacherRecommendations || '',
      headTeacherComments: headTeacherComments || '',
      teacherName,
      dateIssued: dateIssued || new Date().toLocaleDateString('en-GB'),
      nextTermBegins: nextTermBegins || ''
    };

    const result = await Result.findOneAndUpdate(query, updateData, {
      new: true,
      upsert: true,
      runValidators: true
    });

    return res.status(200).json({
      message: 'Result saved successfully',
      result
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Fetch results for a student (Staff view)
export const getStudentResults = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    // Teacher scope check: Verify teacher is assigned to this student's class
    if (req.user?.role === 'TEACHER') {
      const teacher = await User.findById(req.user.id);
      if (!teacher) {
        return res.status(403).json({ message: 'Teacher details not found' });
      }

      const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } });
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const hasAccess = teacher.assignedClasses?.some(
        (cls) => cls.level === student.level && cls.section === student.section
      );
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this student\'s class.' });
      }
    }

    const results = await Result.find({ studentId }).sort({ academicYear: -1, term: -1 });
    return res.status(200).json(results);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Fetch single result by ID (Staff or Parent)
export const getResultById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await Result.findById(id).populate('studentId', '-parentPin');
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    const student: any = result.studentId;

    // Security check: if parent, ensure they only access their child's result and it is approved
    if (req.user?.role === 'PARENT') {
      if (!student || student.admissionNumber !== req.user.admissionNumber) {
        return res.status(403).json({ message: 'Unauthorized: cannot view other students\' results' });
      }
      if (result.status !== 'approved') {
        return res.status(403).json({ message: 'Result is pending approval' });
      }
    }

    // Security check: if teacher, ensure student's class matches teacher's assignedClasses
    if (req.user?.role === 'TEACHER') {
      const teacher = await User.findById(req.user.id);
      if (!teacher) {
        return res.status(403).json({ message: 'Teacher details not found' });
      }
      const hasAccess = teacher.assignedClasses?.some(
        (cls) => cls.level === student?.level && cls.section === student?.section
      );
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this student\'s class.' });
      }
    }

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Parent portal results fetch (using Student ID decoded from token)
export const getParentStudentResults = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'PARENT') {
      return res.status(403).json({ message: 'Access denied: parent only' });
    }

    // Find student by admission number to be safe (exclude parentPin and ignore soft-deleted students)
    const student = await Student.findOne({ admissionNumber: req.user.admissionNumber, isDeleted: { $ne: true } }).select('-parentPin');
    if (!student) {
      return res.status(404).json({ message: 'Student details not found' });
    }

    const results = await Result.find({ studentId: student._id, status: 'approved' }).sort({ academicYear: -1, term: -1 });
    return res.status(200).json({
      student,
      results
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
