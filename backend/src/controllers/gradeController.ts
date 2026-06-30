import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import Result from '../models/Result';
import User from '../models/User';
import Tenant from '../models/Tenant';
import { computeResultMetrics } from '../utils/gradeCalculator';

// Fetch students assigned to teacher based on level and section
export const getStudentsForTeacher = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId || !req.user) return res.status(401).json({ message: 'Unauthorized: Missing tenant context or user session' });

    let filter: any = { tenantId };

    if (req.user.role === 'TEACHER') {
      const teacher = await User.findOne({ tenantId, _id: req.user.id });
      if (!teacher || !teacher.assignedClasses || teacher.assignedClasses.length === 0) {
        return res.status(200).json([]); // No classes assigned
      }
      
      const level = req.query.level as string;
      const section = req.query.section as string;

      if (level && section) {
        // Verify teacher is assigned to this specific class
        const isAssigned = teacher.assignedClasses.some(
          (cls) => cls.level === level && cls.section === section
        );
        if (!isAssigned) {
          return res.status(403).json({ message: 'Access denied: You are not assigned to this class.' });
        }
        filter = { tenantId, level, section, isDeleted: { $ne: true } };
      } else {
        // Formulate OR query to match any assigned level + section
        const classOrFilters = teacher.assignedClasses.map((cls) => ({
          level: cls.level,
          section: cls.section,
        }));
        filter = { tenantId, $or: classOrFilters, isDeleted: { $ne: true } };
      }
    } else {
      // Admin / Accountant / Director filters (optional query params)
      const { level, section } = req.query;
      filter.isDeleted = { $ne: true };
      if (level) filter.level = level;
      if (section) filter.section = section;
    }

    const students = await Student.find(filter).select('-parentPin').sort({ name: 1 });
    
    // Add grading status for each student
    const { academicYear, term } = req.query;
    if (academicYear && term) {
      const results = await Result.find({ tenantId, academicYear, term });
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
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const {
      studentId,
      academicYear,
      term,
      subjects, // Array of SubjectInput
      tahfeezhDetails,
      evaluationElements,
      supervisorRecommendations,
      teacherRecommendations,
      headTeacherComments,
      dateIssued,
      nextTermBegins,
      attendanceSummary,
      affectiveDomain,
      psychomotorSkills,
      cognitiveDomain,
      dob,
      gender,
      house,
      club
    } = req.body;

    if (!studentId || !academicYear || !term || !subjects) {
      return res.status(400).json({ message: 'Missing required grading fields' });
    }

    const student = await Student.findOne({ tenantId, _id: studentId, isDeleted: { $ne: true } });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Update student fields if provided (e.g. from teacher's or admin's result submission)
    let studentUpdated = false;
    if (dob !== undefined && dob !== student.dob) { (student as any).dob = dob; studentUpdated = true; }
    if (gender !== undefined && gender !== student.gender) { (student as any).gender = gender; studentUpdated = true; }
    if (house !== undefined && house !== student.house) { (student as any).house = house; studentUpdated = true; }
    if (club !== undefined && club !== student.club) { (student as any).club = club; studentUpdated = true; }
    if (studentUpdated) {
      await student.save();
    }

    const tenant = await Tenant.findById(tenantId);
    const isAlQalam = tenant?.slug === 'alqalam';

    let allowedSubjects: string[] = [];
    let isTeacher = false;
    let teachesTahfeezh = false;
    let teachesAcademic = false;

    // Teacher scope check: Verify teacher assignment before allowing write
    if (req.user?.role === 'TEACHER') {
      isTeacher = true;
      const teacher = await User.findOne({ tenantId, _id: req.user.id });
      if (!teacher) {
        return res.status(403).json({ message: 'Teacher account not found' });
      }
      
      const teacherClassAssignments = teacher.assignedClasses?.filter(
        (cls) => cls.level === student.level && cls.section === student.section
      ) || [];

      if (teacherClassAssignments.length === 0) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this student\'s class.' });
      }

      allowedSubjects = teacherClassAssignments.map(cls => cls.subjectName);
      
      // Determine what sections the teacher teaches
      const canGradeAll = allowedSubjects.some(s => s?.toLowerCase() === 'both' || s?.toLowerCase() === 'all' || s?.toLowerCase() === 'both/all');
      for (const subj of subjects) {
        if (allowedSubjects.includes(subj.subjectName) || canGradeAll) {
          if (subj.section === 'tahfeezh' || subj.section === 'islamic') teachesTahfeezh = true;
          if (subj.section === 'academic') teachesAcademic = true;
        }
      }
    }

    // Fetch existing result
    const existingResult = await Result.findOne({ tenantId, studentId, academicYear, term });

    let finalSubjectsList = [];
    let finalTahfeezhDetails = tahfeezhDetails || {};
    let finalEvaluationElements = evaluationElements || [];
    let finalTeacherRec = teacherRecommendations || '';
    let finalSupervisorRec = supervisorRecommendations || '';
    let finalHeadTeacherComm = headTeacherComments || '';

    if (existingResult) {
      // 1. Merge subjects
      const existingSubjectsMap = new Map(existingResult.subjects.map(s => [s.subjectName, s]));
      
      const canGradeAll = allowedSubjects.some(s => s?.toLowerCase() === 'both' || s?.toLowerCase() === 'all' || s?.toLowerCase() === 'both/all');
      finalSubjectsList = subjects.map((incomingSubj: any) => {
        const existingSubj = existingSubjectsMap.get(incomingSubj.subjectName);
        if (isTeacher) {
          // If teacher is allowed to grade this subject, update it
          if (allowedSubjects.includes(incomingSubj.subjectName) || canGradeAll) {
            return incomingSubj;
          }
          // Otherwise, preserve the existing subject grade
          return existingSubj ? existingSubj.toObject() : { ...incomingSubj, score60: 0, score20_1: 0, score20_2: 0, score100: 0, grade: '', isGraded: false };
        }
        // Admin or other roles can edit everything
        return incomingSubj;
      });

      // 2. Merge Tahfeezh Details and Recommendations
      if (isTeacher) {
        if (teachesTahfeezh) {
          finalTahfeezhDetails = tahfeezhDetails || {};
          finalSupervisorRec = supervisorRecommendations || existingResult.supervisorRecommendations || '';
        } else {
          finalTahfeezhDetails = existingResult.tahfeezhDetails || {};
          finalSupervisorRec = existingResult.supervisorRecommendations || '';
        }

        if (teachesAcademic) {
          finalTeacherRec = teacherRecommendations || existingResult.teacherRecommendations || '';
        } else {
          finalTeacherRec = existingResult.teacherRecommendations || '';
        }
        
        finalHeadTeacherComm = existingResult.headTeacherComments || '';
      }

      // 3. Merge evaluations (Manners & Performance Ratings)
      if (isTeacher) {
        const existingEvalMap = new Map((existingResult.evaluationElements || []).map(el => [el.elementLabel, el.rating]));
        finalEvaluationElements = (evaluationElements || []).map((incomingEl: any) => {
          // If teacher teaches Tahfeezh, allow them to edit evaluation ratings. Otherwise keep existing.
          if (teachesTahfeezh) {
            return incomingEl;
          }
          return {
            ...incomingEl,
            rating: existingEvalMap.has(incomingEl.elementLabel) ? existingEvalMap.get(incomingEl.elementLabel) : ''
          };
        });
      }
    } else {
      const canGradeAll = allowedSubjects.some(s => s?.toLowerCase() === 'both' || s?.toLowerCase() === 'all' || s?.toLowerCase() === 'both/all');
      // Create new result sheet - but if teacher, initialize non-assigned subjects as ungraded
      finalSubjectsList = subjects.map((incomingSubj: any) => {
        if (isTeacher && !allowedSubjects.includes(incomingSubj.subjectName) && !canGradeAll) {
          return {
            ...incomingSubj,
            score60: 0,
            score20_1: 0,
            score20_2: 0,
            score100: 0,
            grade: '',
            isGraded: false
          };
        }
        return incomingSubj;
      });

      if (isTeacher) {
        if (!teachesTahfeezh) {
          finalTahfeezhDetails = { absenceOfHifz: 0, daysPresent: 0, daysAbsent: 0, fromSurah: '', toSurah: '', memorizedPages: 0 };
          finalSupervisorRec = '';
          finalEvaluationElements = (evaluationElements || []).map((el: any) => ({ ...el, rating: '' }));
        }
        if (!teachesAcademic) {
          finalTeacherRec = '';
        }
        finalHeadTeacherComm = '';
      }
    }

    // Run auto-grading engine
    const computed = computeResultMetrics(finalSubjectsList, isAlQalam);

    // Get carry-over term score for Al-Qalam Kaduna
    if (isAlQalam) {
      const firstTermResult = await Result.findOne({
        tenantId,
        studentId,
        academicYear,
        term: 'First Term'
      });
      if (firstTermResult) {
        computed.subjects.forEach((subj: any) => {
          const firstTermSubj = firstTermResult.subjects.find((s: any) => s.subjectName === subj.subjectName);
          if (firstTermSubj) {
            subj.prevTermScore = firstTermSubj.score100 || 0;
          }
        });
      }
    }

    // Get current teacher/admin name
    const teacherName = req.user?.name || 'Unknown Teacher';

    // Find and update or create
    const query = { tenantId, studentId, academicYear, term };
    const updateData: any = {
      level: student.level,
      section: student.section,
      subjects: computed.subjects,
      tahfeezhDetails: finalTahfeezhDetails,
      evaluationElements: finalEvaluationElements,
      totalMark: computed.totalMark,
      finalAverage: computed.finalAverage,
      generalGrade: computed.generalGrade,
      supervisorRecommendations: finalSupervisorRec,
      teacherRecommendations: finalTeacherRec,
      headTeacherComments: finalHeadTeacherComm,
      teacherName,
      dateIssued: dateIssued || new Date().toLocaleDateString('en-GB'),
      nextTermBegins: nextTermBegins || ''
    };

    const isConventional = tenant?.curriculumType === 'conventional';

    if (isAlQalam || isConventional) {
      if (attendanceSummary !== undefined) updateData.attendanceSummary = attendanceSummary;
      if (affectiveDomain !== undefined) updateData.affectiveDomain = affectiveDomain;
      if (psychomotorSkills !== undefined) updateData.psychomotorSkills = psychomotorSkills;
      if (cognitiveDomain !== undefined) updateData.cognitiveDomain = cognitiveDomain;
    }

    const result = await Result.findOneAndUpdate(query, updateData, {
      new: true,
      upsert: true,
      runValidators: true
    });

    // Recalculate positions and class averages for this class
    await recalculateClassMetrics(tenantId, student.level, student.section, academicYear, term);

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
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { studentId } = req.params;

    // Teacher scope check: Verify teacher is assigned to this student's class
    if (req.user?.role === 'TEACHER') {
      const teacher = await User.findOne({ tenantId, _id: req.user.id });
      if (!teacher) {
        return res.status(403).json({ message: 'Teacher details not found' });
      }

      const student = await Student.findOne({ tenantId, _id: studentId, isDeleted: { $ne: true } });
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

    const { term, academicYear } = req.query;
    const filter: any = { tenantId, studentId };
    if (term) filter.term = String(term);
    if (academicYear) filter.academicYear = String(academicYear);

    const results = await Result.find(filter).sort({ academicYear: -1, term: -1 });
    return res.status(200).json(results);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Fetch single result by ID (Staff or Parent)
export const getResultById = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { id } = req.params;
    const result = await Result.findOne({ tenantId, _id: id }).populate('studentId', '-parentPin');
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
      const teacher = await User.findOne({ tenantId, _id: req.user.id });
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
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId || !req.user || req.user.role !== 'PARENT') {
      return res.status(403).json({ message: 'Access denied: parent only' });
    }

    // Find student by admission number to be safe (exclude parentPin and ignore soft-deleted students)
    const student = await Student.findOne({ tenantId, admissionNumber: req.user.admissionNumber, isDeleted: { $ne: true } }).select('-parentPin');
    if (!student) {
      return res.status(404).json({ message: 'Student details not found' });
    }

    const results = await Result.find({ tenantId, studentId: student._id, status: 'approved' }).sort({ academicYear: -1, term: -1 });
    return res.status(200).json({
      student,
      results
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helpers for dynamic class metrics
const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const recalculateClassMetrics = async (tenantId: any, level: string, section: string, academicYear: string, term: string) => {
  try {
    // Fetch all results for this class
    const results = await Result.find({ tenantId, level, section, academicYear, term });
    if (results.length === 0) return;

    // 1. Calculate class average for each subject
    const subjectScoresMap = new Map<string, number[]>();
    results.forEach(res => {
      res.subjects.forEach(subj => {
        if (subj.isGraded) {
          if (!subjectScoresMap.has(subj.subjectName)) {
            subjectScoresMap.set(subj.subjectName, []);
          }
          subjectScoresMap.get(subj.subjectName)!.push(subj.score100);
        }
      });
    });

    const subjectAveragesMap = new Map<string, number>();
    subjectScoresMap.forEach((scores, subjectName) => {
      const sum = scores.reduce((a, b) => a + b, 0);
      const avg = scores.length > 0 ? Math.round((sum / scores.length) * 10) / 10 : 0;
      subjectAveragesMap.set(subjectName, avg);
    });

    // 2. Determine subject position (rank) for each student in each subject
    const subjectRanksMap = new Map<string, { studentId: string; score: number }[]>();
    results.forEach(res => {
      res.subjects.forEach(subj => {
        if (subj.isGraded) {
          if (!subjectRanksMap.has(subj.subjectName)) {
            subjectRanksMap.set(subj.subjectName, []);
          }
          subjectRanksMap.get(subj.subjectName)!.push({
            studentId: res.studentId.toString(),
            score: subj.score100
          });
        }
      });
    });

    // Sort ranks
    const subjectStudentPositionsMap = new Map<string, Map<string, string>>();
    subjectRanksMap.forEach((studentScores, subjectName) => {
      studentScores.sort((a, b) => b.score - a.score);
      const positions = new Map<string, string>();
      let rank = 1;
      for (let i = 0; i < studentScores.length; i++) {
        if (i > 0 && studentScores[i].score < studentScores[i - 1].score) {
          rank = i + 1;
        }
        const ord = getOrdinal(rank);
        positions.set(studentScores[i].studentId, ord);
      }
      subjectStudentPositionsMap.set(subjectName, positions);
    });

    // Update all results with the calculated class average and position
    for (const res of results) {
      let updated = false;
      res.subjects.forEach(subj => {
        if (subj.isGraded) {
          const avg = subjectAveragesMap.get(subj.subjectName) || 0;
          const pos = subjectStudentPositionsMap.get(subj.subjectName)?.get(res.studentId.toString()) || '1st';
          
          if (subj.classAverage !== avg || subj.subjectPosition !== pos) {
            subj.classAverage = avg;
            subj.subjectPosition = pos;
            updated = true;
          }
        }
      });
      if (updated) {
        await res.save();
      }
    }
  } catch (err) {
    console.error('Error recalculating class metrics:', err);
  }
};
