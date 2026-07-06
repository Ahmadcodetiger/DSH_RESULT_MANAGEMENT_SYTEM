import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import Result from '../models/Result';
import User from '../models/User';
import Tenant from '../models/Tenant';
import Subject from '../models/Subject';
import { computeResultMetrics, isNurseryOrHub, NURSERY_SUBJECT_NAMES, getNurserySubjectNames } from '../utils/gradeCalculator';

// Fetch students assigned to teacher based on level and section
export const getStudentsForTeacher = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId || !req.user) return res.status(401).json({ message: 'Unauthorized: Missing tenant context or user session' });

    let filter: any = { tenantId, isDeleted: { $ne: true } };

    if (req.user.role === 'TEACHER') {
      const teacher = await User.findOne({ tenantId, _id: req.user.id });
      const hasTeachingClasses = teacher?.assignedClasses && teacher.assignedClasses.length > 0;
      const hasClassTeacherClasses = teacher?.classTeacherClasses && teacher.classTeacherClasses.length > 0;

      if (!teacher || (!hasTeachingClasses && !hasClassTeacherClasses)) {
        return res.status(200).json([]); // No classes assigned
      }
      
      const level = req.query.level as string;
      const section = req.query.section as string;
      const subjectName = req.query.subjectName as string;

      // Build union of classes the teacher has access to
      const teacherClasses: { level: string; section: string }[] = [];
      const seen = new Set<string>();

      if (hasTeachingClasses) {
        teacher.assignedClasses.forEach((cls) => {
          const key = `${cls.level}-${cls.section}`;
          if (!seen.has(key)) {
            seen.add(key);
            teacherClasses.push({ level: cls.level, section: cls.section });
          }
        });
      }

      if (hasClassTeacherClasses) {
        teacher.classTeacherClasses.forEach((cls: any) => {
          const key = `${cls.level}-${cls.section}`;
          if (!seen.has(key)) {
            seen.add(key);
            teacherClasses.push({ level: cls.level, section: cls.section });
          }
        });
      }

      if (level && section) {
        // Verify teacher is assigned to this specific class either as subject or class teacher
        const isAssigned = teacherClasses.some(
          (cls) => cls.level === level && cls.section === section
        );
        if (!isAssigned) {
          return res.status(403).json({ message: 'Access denied: You are not assigned to this class.' });
        }
        filter = { tenantId, level, section, isDeleted: { $ne: true } };
      } else {
        // Formulate OR query to match any assigned level + section
        const classOrFilters = teacherClasses.map((cls) => ({
          level: cls.level,
          section: cls.section,
        }));
        filter = { tenantId, $or: classOrFilters, isDeleted: { $ne: true } };
      }

      // If subjectName is specified, check if it's a tahfeezh/islamic subject and filter accordingly
      if (subjectName) {
        const subject = await Subject.findOne({ tenantId, name: subjectName });
        if (subject && (subject.section === 'tahfeezh' || subject.section === 'islamic')) {
          const students = await Student.find(filter).select('-parentPin').sort({ name: 1 });
          const isTahfeezSection = (s: any) => {
            const sec = (s.section || '').toUpperCase();
            const lev = (s.level || '').toUpperCase();
            return sec.includes('TAHFEEZ') || sec.includes('ISLAMIC') || sec.includes('QURAN') ||
                   lev.includes('TAHFEEZ') || lev.includes('ISLAMIC') || lev.includes('QURAN');
          };
          const filteredStudents = students.filter(isTahfeezSection);

          // Add grading status for each student
          const { academicYear, term } = req.query;
          if (academicYear && term) {
            const results = await Result.find({ tenantId, academicYear, term });
            const resultMap = new Map(results.map(r => [r.studentId.toString(), r]));
            
            const studentsWithStatus = filteredStudents.map(s => {
              const studentObj = s.toObject();
              return {
                ...studentObj,
                hasResult: resultMap.has(s._id.toString()),
                resultId: resultMap.has(s._id.toString()) ? resultMap.get(s._id.toString())?._id : null
              };
            });
            return res.status(200).json(studentsWithStatus);
          }
          return res.status(200).json(filteredStudents);
        }
      }
    } else {
      // Admin / Accountant / Director filters (optional query params)
      const { level, section } = req.query;
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
      estimatedResumptionDate,
      nextTermSchoolFees,
      attendanceSummary,
      affectiveDomain,
      psychomotorSkills,
      cognitiveDomain,
      dob,
      gender,
      house,
      club,
      status
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
    const isAlQalam = tenant?.slug === 'alqalam' || tenant?.slug === 'alqalamacademy' || tenant?.slug === 'al-qalam-academy';

    let allowedSubjects: string[] = [];
    let isTeacher = false;
    let isClassTeacher = false;
    let teachesTahfeezh = false;
    let teachesAcademic = false;

    // Teacher scope check: Verify teacher assignment before allowing write
    if (req.user?.role === 'TEACHER') {
      isTeacher = true;
      const teacher = await User.findOne({ tenantId, _id: req.user.id });
      if (!teacher) {
        return res.status(403).json({ message: 'Teacher account not found' });
      }
      
      isClassTeacher = teacher.classTeacherClasses?.some(
        (cls: any) => cls.level === student.level && cls.section === student.section
      ) || false;

      const teacherClassAssignments = teacher.assignedClasses?.filter(
        (cls) => cls.level === student.level && cls.section === student.section
      ) || [];

      if (teacherClassAssignments.length === 0 && !isClassTeacher) {
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

    // Result locking verification
    if (existingResult && (existingResult.status === 'approved' || existingResult.status === 'submitted')) {
      return res.status(403).json({ message: 'Access denied: This report card has been submitted or approved and is locked.' });
    }

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
          if (isClassTeacher || allowedSubjects.includes(incomingSubj.subjectName) || canGradeAll) {
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
        if (teachesTahfeezh || isClassTeacher) {
          finalTahfeezhDetails = tahfeezhDetails || {};
          finalSupervisorRec = supervisorRecommendations || existingResult.supervisorRecommendations || '';
        } else {
          finalTahfeezhDetails = existingResult.tahfeezhDetails || {};
          finalSupervisorRec = existingResult.supervisorRecommendations || '';
        }

        if (isClassTeacher) {
          finalTeacherRec = teacherRecommendations || '';
        } else {
          finalTeacherRec = existingResult.teacherRecommendations || '';
        }
        
        finalHeadTeacherComm = existingResult.headTeacherComments || '';
      }

      // 3. Merge evaluations (Manners & Performance Ratings)
      if (isTeacher) {
        const existingEvalMap = new Map((existingResult.evaluationElements || []).map(el => [el.elementLabel, el.rating]));
        finalEvaluationElements = (evaluationElements || []).map((incomingEl: any) => {
          if (teachesTahfeezh || isClassTeacher) {
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
        if (isTeacher && !isClassTeacher && !allowedSubjects.includes(incomingSubj.subjectName) && !canGradeAll) {
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
        if (!teachesTahfeezh && !isClassTeacher) {
          finalTahfeezhDetails = { absenceOfHifz: 0, daysPresent: 0, daysAbsent: 0, fromSurah: '', toSurah: '', memorizedPages: 0 };
          finalSupervisorRec = '';
          finalEvaluationElements = (evaluationElements || []).map((el: any) => ({ ...el, rating: '' }));
        }
        if (!isClassTeacher) {
          finalTeacherRec = '';
        }
        finalHeadTeacherComm = '';
      }
    }

    // Run auto-grading engine
    const computed = computeResultMetrics(finalSubjectsList, isAlQalam, student.section, student.level);

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
      status: status || 'draft'
    };

    const isConventional = tenant?.curriculumType === 'conventional';

    if (isAlQalam || isConventional) {
      if (isTeacher) {
        if (isClassTeacher) {
          if (attendanceSummary !== undefined) updateData.attendanceSummary = attendanceSummary;
          if (affectiveDomain !== undefined) updateData.affectiveDomain = affectiveDomain;
          if (psychomotorSkills !== undefined) updateData.psychomotorSkills = psychomotorSkills;
          if (cognitiveDomain !== undefined) updateData.cognitiveDomain = cognitiveDomain;
        } else {
          if (existingResult) {
            updateData.attendanceSummary = existingResult.attendanceSummary;
            updateData.affectiveDomain = existingResult.affectiveDomain;
            updateData.psychomotorSkills = existingResult.psychomotorSkills;
            updateData.cognitiveDomain = existingResult.cognitiveDomain;
          }
        }
      } else {
        if (attendanceSummary !== undefined) updateData.attendanceSummary = attendanceSummary;
        if (affectiveDomain !== undefined) updateData.affectiveDomain = affectiveDomain;
        if (psychomotorSkills !== undefined) updateData.psychomotorSkills = psychomotorSkills;
        if (cognitiveDomain !== undefined) updateData.cognitiveDomain = cognitiveDomain;
      }
    }

    if (isTeacher) {
      if (isClassTeacher) {
        const allowClassTeacherNextTerm = tenant?.academicConfig?.allowClassTeacherNextTermEdit !== false;
        if (allowClassTeacherNextTerm) {
          if (nextTermBegins !== undefined) updateData.nextTermBegins = nextTermBegins;
          if (estimatedResumptionDate !== undefined) updateData.estimatedResumptionDate = estimatedResumptionDate;
          if (nextTermSchoolFees !== undefined) updateData.nextTermSchoolFees = nextTermSchoolFees;
        } else {
          if (existingResult) {
            updateData.nextTermBegins = existingResult.nextTermBegins;
            updateData.estimatedResumptionDate = existingResult.estimatedResumptionDate;
            updateData.nextTermSchoolFees = existingResult.nextTermSchoolFees;
          }
        }
      } else {
        if (existingResult) {
          updateData.nextTermBegins = existingResult.nextTermBegins;
          updateData.estimatedResumptionDate = existingResult.estimatedResumptionDate;
          updateData.nextTermSchoolFees = existingResult.nextTermSchoolFees;
        }
      }
    } else {
      if (nextTermBegins !== undefined) updateData.nextTermBegins = nextTermBegins;
      if (estimatedResumptionDate !== undefined) updateData.estimatedResumptionDate = estimatedResumptionDate;
      if (nextTermSchoolFees !== undefined) updateData.nextTermSchoolFees = nextTermSchoolFees;
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

const decorateResultWithClassRank = async (resObj: any, tenantId: any) => {
  const obj = resObj.toObject ? resObj.toObject() : resObj;
  const allResultsInClass = await Result.find({
    tenantId,
    level: obj.level,
    section: obj.section,
    academicYear: obj.academicYear,
    term: obj.term
  }).sort({ finalAverage: -1 });
  
  const rankIdx = allResultsInClass.findIndex(r => r._id.toString() === obj._id.toString());
  obj.position = rankIdx !== -1 ? rankIdx + 1 : 1;
  obj.totalStudents = allResultsInClass.length;

  // Merge active subjects into result so newly added subjects appear on report sheets
  try {
    const levelStr = String(obj.level || '').toUpperCase();
    const sectionStr = String(obj.section || '').toUpperCase();
    const isIslamicOrTahfeez = 
      levelStr.includes('TAHFEEZ') || levelStr.includes('ISLAMIC') || levelStr.includes('QURAN') ||
      sectionStr.includes('TAHFEEZ') || sectionStr.includes('ISLAMIC') || sectionStr.includes('QURAN');

    const subjectQuery: any = { tenantId, isActive: true };
    if (isIslamicOrTahfeez) {
      subjectQuery.section = { $in: ['tahfeezh', 'islamic'] };
    } else {
      subjectQuery.section = 'academic';
    }

    const activeSubjects = await Subject.find(subjectQuery);
    if (activeSubjects && activeSubjects.length > 0) {
      const rawSubjects = obj.subjects || [];
      const mergedSubjects = activeSubjects.map((s: any) => {
        const existing = rawSubjects.find((sub: any) => sub.subjectName === s.name);
        return existing ? { ...existing, section: existing.section || s.section } : {
          subjectName: s.name,
          subjectNameArabic: s.nameArabic || '',
          score60: 0, score20_1: 0, score20_2: 0, score40: 0, score100: 0,
          grade: '', isGraded: false, section: s.section
        };
      });
      // Keep orphan subjects (graded but no longer in active list)
      const activeNames = new Set(activeSubjects.map((s: any) => s.name));
      const orphans = rawSubjects.filter((s: any) => !activeNames.has(s.subjectName));
      obj.subjects = [...mergedSubjects, ...orphans];
    }
  } catch (err) {
    // Non-critical: if subject merge fails, return result as-is
    console.error('Subject merge in decorateResultWithClassRank failed:', err);
  }

  return obj;
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

      const hasAccess = (teacher.assignedClasses || []).some(
        (cls) => cls.level === student.level && cls.section === student.section
      ) || (teacher.classTeacherClasses || []).some(
        (cls: any) => cls.level === student.level && cls.section === student.section
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
    const decoratedResults = await Promise.all(results.map(r => decorateResultWithClassRank(r, tenantId)));
    return res.status(200).json(decoratedResults);
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

    // Security check: if teacher, ensure student's class matches teacher's assignedClasses or class teacher assignments
    if (req.user?.role === 'TEACHER') {
      const teacher = await User.findOne({ tenantId, _id: req.user.id });
      if (!teacher) {
        return res.status(403).json({ message: 'Teacher details not found' });
      }
      const hasAccess = (teacher.assignedClasses || []).some(
        (cls) => cls.level === student?.level && cls.section === student?.section
      ) || (teacher.classTeacherClasses || []).some(
        (cls: any) => cls.level === student?.level && cls.section === student?.section
      );
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this student\'s class.' });
      }
    }

    const decoratedResult = await decorateResultWithClassRank(result, tenantId);
    if (decoratedResult.status !== 'approved' && req.user && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      decoratedResult.supervisorRecommendations = '';
    }

    return res.status(200).json(decoratedResult);
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
    const decoratedResults = await Promise.all(results.map(r => decorateResultWithClassRank(r, tenantId)));
    return res.status(200).json({
      student,
      results: decoratedResults
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

// Get completion progress dashboard metrics for a class
export const getClassProgress = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant context required' });

    const { level, section, academicYear, term } = req.query;
    if (!level || !section || !academicYear || !term) {
      return res.status(400).json({ message: 'Missing query parameters' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    // Check if the user is a teacher and is assigned as Class Teacher for this class
    if (req.user?.role === 'TEACHER') {
      const teacher = await User.findOne({ tenantId, _id: req.user.id });
      const isClassTeacher = teacher?.classTeacherClasses?.some(
        (c: any) => c.level === level && c.section === section
      );
      if (!isClassTeacher) {
        return res.status(403).json({ message: 'Access denied: You are not the Class Teacher for this class.' });
      }
    }

    // 1. Get all students in the class
    const students = await Student.find({ tenantId, level, section, isDeleted: { $ne: true } }).sort({ name: 1 });
    const studentIds = students.map(s => s._id);

    // 2. Get results for these students
    const results = await Result.find({
      tenantId,
      studentId: { $in: studentIds },
      academicYear,
      term
    });
    const resultMap = new Map(results.map(r => [r.studentId.toString(), r]));

    // 3. Get all teachers assigned to teach in this class
    const teachers = await User.find({
      tenantId,
      role: 'TEACHER',
      assignedClasses: { $elemMatch: { level, section } }
    });

    // We want to map each subject in this class to its teacher(s)
    const subjectTeacherMap = new Map<string, string[]>();
    teachers.forEach(t => {
      t.assignedClasses.forEach(c => {
        if (c.level === level && c.section === section) {
          const teachersList = subjectTeacherMap.get(c.subjectName) || [];
          teachersList.push(t.name);
          subjectTeacherMap.set(c.subjectName, teachersList);
        }
      });
    });

    // 4. Determine expected subjects
    const isNursery = isNurseryOrHub(level as string, section as string);
    const expectedSubjects = isNursery ? getNurserySubjectNames(level as string, term as string) : Array.from(subjectTeacherMap.keys());

    // 5. Build checklist for each student and track pending grading
    const pendingTeachersMap = new Map<string, Set<string>>(); // subjectName -> Set of teacher names
    let totalCompletedReports = 0;

    const studentStatuses = students.map(student => {
      const result = resultMap.get(student._id.toString());
      
      let checklist = {
        subjectScores: 'pending',
        attendance: 'pending',
        affectiveDomain: 'pending',
        psychomotorSkills: 'pending',
        classTeacherRemark: 'pending',
        reportReady: 'no'
      };

      let subjectsStatus: any[] = [];
      let totalSubjects = expectedSubjects.length;
      let gradedCount = 0;

      if (result) {
        // Evaluate subject scores completeness
        expectedSubjects.forEach(subName => {
          const match = result.subjects.find((s: any) => s.subjectName === subName);
          const isGraded = match ? match.isGraded : false;
          if (isGraded) {
            gradedCount++;
          } else {
            // Find which teacher is pending
            const assignedTeachers = subjectTeacherMap.get(subName) || ['Unassigned'];
            if (!pendingTeachersMap.has(subName)) {
              pendingTeachersMap.set(subName, new Set(assignedTeachers));
            } else {
              assignedTeachers.forEach(t => pendingTeachersMap.get(subName)?.add(t));
            }
          }
          subjectsStatus.push({ subjectName: subName, isGraded });
        });

        const allSubjectsGraded = totalSubjects > 0 && gradedCount === totalSubjects;
        checklist.subjectScores = allSubjectsGraded ? 'complete' : 'pending';

        // Attendance (complete if timesOpened exists and > 0)
        const hasAttendance = result.attendanceSummary && result.attendanceSummary.timesOpened > 0;
        checklist.attendance = hasAttendance ? 'complete' : 'pending';

        // Affective (complete if exists)
        const hasAffective = result.affectiveDomain && (result.affectiveDomain.attentiveness > 0 || result.affectiveDomain.honesty > 0);
        checklist.affectiveDomain = hasAffective ? 'complete' : 'pending';

        // Psychomotor (complete if exists)
        const hasPsychomotor = result.psychomotorSkills && (result.psychomotorSkills.handlingTools > 0 || result.psychomotorSkills.drawingPainting > 0);
        checklist.psychomotorSkills = hasPsychomotor ? 'complete' : 'pending';

        // Class Teacher's Remark (complete if teacherRecommendations is not empty)
        const hasRemark = result.teacherRecommendations && result.teacherRecommendations.trim().length > 0;
        checklist.classTeacherRemark = hasRemark ? 'complete' : 'pending';

        const isReady = allSubjectsGraded && hasAttendance && hasAffective && hasPsychomotor && hasRemark;
        checklist.reportReady = isReady ? 'yes' : 'no';
        if (isReady) {
          totalCompletedReports++;
        }
      } else {
        // No result created yet
        expectedSubjects.forEach(subName => {
          const assignedTeachers = subjectTeacherMap.get(subName) || ['Unassigned'];
          if (!pendingTeachersMap.has(subName)) {
            pendingTeachersMap.set(subName, new Set(assignedTeachers));
          } else {
            assignedTeachers.forEach(t => pendingTeachersMap.get(subName)?.add(t));
          }
          subjectsStatus.push({ subjectName: subName, isGraded: false });
        });
      }

      return {
        studentId: student._id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        resultId: result ? result._id : null,
        status: result ? result.status : 'draft',
        checklist,
        gradingProgress: {
          graded: gradedCount,
          total: totalSubjects
        }
      };
    });

    // Format pending teachers list
    const pendingTeachers: any[] = [];
    pendingTeachersMap.forEach((teachersSet, subjectName) => {
      pendingTeachers.push({
        subjectName,
        teachers: Array.from(teachersSet)
      });
    });

    const completionRate = students.length > 0 ? Math.round((totalCompletedReports / students.length) * 100) : 0;

    return res.status(200).json({
      classInfo: { level, section, academicYear, term },
      students: studentStatuses,
      pendingTeachers,
      completionRate,
      allowClassTeacherNextTermEdit: tenant.academicConfig?.allowClassTeacherNextTermEdit !== false
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching class progress', error: error.message });
  }
};

// Bulk submit class results for approval
export const submitClassResultsForApproval = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant context required' });

    const { level, section, academicYear, term } = req.body;
    if (!level || !section || !academicYear || !term) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Verify teacher is Class Teacher for this class
    if (req.user?.role === 'TEACHER') {
      const teacher = await User.findOne({ tenantId, _id: req.user.id });
      const isClassTeacher = teacher?.classTeacherClasses?.some(
        (c: any) => c.level === level && c.section === section
      );
      if (!isClassTeacher) {
        return res.status(403).json({ message: 'Access denied: You are not the Class Teacher for this class.' });
      }
    }

    // Find all results matching query and update status to 'submitted'
    const resultUpdate = await Result.updateMany(
      { tenantId, level, section, academicYear, term, status: { $ne: 'approved' } },
      { status: 'submitted' }
    );

    return res.status(200).json({ 
      message: `Successfully submitted ${resultUpdate.modifiedCount} class reports for approval.`,
      modifiedCount: resultUpdate.modifiedCount
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error submitting class results', error: error.message });
  }
};

// Public Result Verification
export const verifyResultPublicly = async (req: any, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { id } = req.params;
    const result = await Result.findOne({ tenantId, _id: id }).populate('studentId', 'name admissionNumber level section picture');
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    if (result.status !== 'approved') {
      return res.status(400).json({ message: 'This result is not yet approved/released by the school administration.' });
    }

    return res.status(200).json({
      verified: true,
      result: {
        _id: result._id,
        academicYear: result.academicYear,
        term: result.term,
        level: result.level,
        section: result.section,
        totalMark: result.totalMark,
        finalAverage: result.finalAverage,
        generalGrade: result.generalGrade,
        dateIssued: result.dateIssued,
        studentName: (result.studentId as any)?.name,
        admissionNumber: (result.studentId as any)?.admissionNumber,
        picture: (result.studentId as any)?.picture
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Verification error', error: error.message });
  }
};

