import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Student from '../models/Student';
import Result from '../models/Result';
import Notification from '../models/Notification';
import Tenant from '../models/Tenant';
import SchoolClass from '../models/SchoolClass';
import Subject from '../models/Subject';
import AuditLog from '../models/AuditLog';

// --- Teacher Management ---

// Create a new staff user
export const createTeacher = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, name, assignedClasses, classTeacherClasses, role } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Missing required staff fields' });
    }

    const formattedUsername = username.trim().toLowerCase();
    const existingUser = await User.findOne({ tenantId, username: formattedUsername });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists for this school' });
    }

    const allowedRoles = ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'DIRECTOR'];
    const finalRole = allowedRoles.includes(role) ? role : 'TEACHER';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const tenant = await Tenant.findById(tenantId);
    let finalClassTeacherClasses = finalRole === 'TEACHER' ? (classTeacherClasses || []) : [];

    if (finalRole === 'TEACHER' && finalClassTeacherClasses.length > 0) {
      const allowMultiple = tenant?.academicConfig?.allowMultipleClassTeacherAssignments === true;
      if (!allowMultiple && finalClassTeacherClasses.length > 1) {
        finalClassTeacherClasses = [finalClassTeacherClasses[0]];
      }

      // For each assigned class, remove previous Class Teacher assignments
      for (const cls of finalClassTeacherClasses) {
        await User.updateMany(
          {
            tenantId,
            classTeacherClasses: { $elemMatch: { level: cls.level, section: cls.section } }
          },
          {
            $pull: { classTeacherClasses: { level: cls.level, section: cls.section } }
          }
        );
      }
    }

    const teacher = new User({
      tenantId,
      username: formattedUsername,
      password: hashedPassword,
      name,
      role: finalRole,
      assignedClasses: finalRole === 'TEACHER' ? (assignedClasses || []) : [],
      classTeacherClasses: finalClassTeacherClasses,
    });

    await teacher.save();

    // Log action
    await AuditLog.create({
      tenantId,
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'USER_CREATED',
      resource: 'User',
      resourceId: teacher._id,
      description: `Staff user ${name} (${finalRole}) created`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(201).json({ message: 'Staff created successfully', teacher: { id: teacher._id, username: formattedUsername, name, role: finalRole } });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// List all staff users
export const getTeachers = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const teachers = await User.find({ 
      tenantId, 
      role: { $in: ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'DIRECTOR'] } 
    }).select('-password');
    return res.status(200).json(teachers);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update staff user
export const updateTeacher = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username, name, assignedClasses, classTeacherClasses, password, isActive, role } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const teacher = await User.findOne({ 
      tenantId, 
      _id: id, 
      role: { $in: ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'DIRECTOR'] } 
    });
    if (!teacher) {
      return res.status(404).json({ message: 'Staff user not found' });
    }

    const oldState = teacher.toObject();

    if (username) teacher.username = username.trim().toLowerCase();
    if (name) teacher.name = name;
    
    const allowedRoles = ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'DIRECTOR'];
    if (role && allowedRoles.includes(role)) {
      teacher.role = role as any;
    }

    if (teacher.role === 'TEACHER') {
      if (assignedClasses) teacher.assignedClasses = assignedClasses;
      
      if (classTeacherClasses) {
        const tenant = await Tenant.findById(tenantId);
        const allowMultiple = tenant?.academicConfig?.allowMultipleClassTeacherAssignments === true;
        let finalClassTeacherClasses = classTeacherClasses;
        if (!allowMultiple && finalClassTeacherClasses.length > 1) {
          finalClassTeacherClasses = [finalClassTeacherClasses[0]];
        }

        // For each class in list, clear assignment from any OTHER teacher
        for (const cls of finalClassTeacherClasses) {
          await User.updateMany(
            {
              tenantId,
              _id: { $ne: teacher._id },
              classTeacherClasses: { $elemMatch: { level: cls.level, section: cls.section } }
            },
            {
              $pull: { classTeacherClasses: { level: cls.level, section: cls.section } }
            }
          );
        }
        teacher.classTeacherClasses = finalClassTeacherClasses;
      }
    } else {
      teacher.assignedClasses = [] as any;
      teacher.classTeacherClasses = [] as any;
    }

    if (isActive !== undefined) (teacher as any).isActive = isActive;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      teacher.password = await bcrypt.hash(password, salt);
    }

    await teacher.save();

    // Log action
    await AuditLog.create({
      tenantId,
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'USER_UPDATED',
      resource: 'User',
      resourceId: teacher._id,
      description: `Staff user ${teacher.name} updated`,
      changes: { before: oldState, after: teacher.toObject() },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({ message: 'Staff updated successfully', teacher });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete staff user
export const deleteTeacher = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const teacher = await User.findOneAndDelete({ 
      tenantId, 
      _id: id, 
      role: { $in: ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'DIRECTOR'] } 
    });
    if (!teacher) {
      return res.status(404).json({ message: 'Staff user not found' });
    }

    // Log action
    await AuditLog.create({
      tenantId,
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'USER_DELETED',
      resource: 'User',
      resourceId: teacher._id,
      description: `Staff user ${teacher.name} deleted`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({ message: 'Staff user deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- Student Management ---

// Helper function to parse CSV lines respecting quotes
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Bulk upload students via JSON list or CSV
export const uploadStudents = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    // Fetch tenant configuration for default academic year
    const tenant = await Tenant.findById(tenantId);
    const defaultAcademicYear = tenant?.academicConfig?.currentAcademicYear || '2025/2026';

    let students = req.body.students;

    // Parse CSV data if provided
    if (req.body.csvData && typeof req.body.csvData === 'string') {
      students = [];
      const lines = req.body.csvData.split(/\r?\n/);
      if (lines.length > 0) {
        // Check if first line is a header
        const firstLineParts = parseCsvLine(lines[0]);
        const hasHeader = firstLineParts.some(part => {
          const lower = part.toLowerCase().replace(/[^a-z0-9]/g, '');
          return (
            lower.includes('name') ||
            lower.includes('admission') ||
            lower.includes('level') ||
            lower.includes('class') ||
            lower.includes('section')
          );
        });

        let nameIdx = -1;
        let nameArabicIdx = -1;
        let admissionNumberIdx = -1;
        let levelIdx = -1;
        let sectionIdx = -1;
        let academicYearIdx = -1;
        let parentPinIdx = -1;
        let schoolFeesIdx = -1;
        let dobIdx = -1;
        let genderIdx = -1;
        let houseIdx = -1;
        let clubIdx = -1;

        if (hasHeader) {
          for (let i = 0; i < firstLineParts.length; i++) {
            const col = firstLineParts[i].toLowerCase().replace(/[^a-z0-9]/g, '');
            if (col === 'name' || col === 'studentname' || col === 'fullname' || col === 'studentfullname') {
              nameIdx = i;
            } else if (col === 'namearabic' || col === 'arabicname' || col === 'arabic') {
              nameArabicIdx = i;
            } else if (
              col === 'admissionnumber' ||
              col === 'admissionno' ||
              col === 'admno' ||
              col === 'regno' ||
              col === 'regnumber'
            ) {
              admissionNumberIdx = i;
            } else if (col === 'level' || col === 'class') {
              levelIdx = i;
            } else if (col === 'section') {
              sectionIdx = i;
            } else if (col === 'academicyear' || col === 'session') {
              academicYearIdx = i;
            } else if (col === 'parentpin' || col === 'pin') {
              parentPinIdx = i;
            } else if (col === 'schoolfees' || col === 'fees') {
              schoolFeesIdx = i;
            } else if (col === 'dob' || col === 'dateofbirth' || col === 'birthdate') {
              dobIdx = i;
            } else if (col === 'gender' || col === 'sex') {
              genderIdx = i;
            } else if (col === 'house') {
              houseIdx = i;
            } else if (col === 'club' || col === 'society') {
              clubIdx = i;
            }
          }
        }

        const startIdx = hasHeader ? 1 : 0;
        for (let i = startIdx; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          const parts = parseCsvLine(line);
          if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

          let name = '';
          let nameArabic = '';
          let admissionNumber = '';
          let level = '';
          let section = '';
          let academicYear = defaultAcademicYear;
          let parentPin = '';
          let schoolFees = 0;
          let dob = '';
          let gender = '';
          let house = '';
          let club = '';

          if (hasHeader) {
            if (nameIdx !== -1) name = parts[nameIdx] || '';
            if (nameArabicIdx !== -1) nameArabic = parts[nameArabicIdx] || '';
            if (admissionNumberIdx !== -1) admissionNumber = parts[admissionNumberIdx] || '';
            if (levelIdx !== -1) level = parts[levelIdx] || '';
            if (sectionIdx !== -1) section = parts[sectionIdx] || '';
            if (academicYearIdx !== -1) academicYear = parts[academicYearIdx] || defaultAcademicYear;
            if (parentPinIdx !== -1) parentPin = parts[parentPinIdx] || '';
            if (schoolFeesIdx !== -1) schoolFees = Number(parts[schoolFeesIdx]) || 0;
            if (dobIdx !== -1) dob = parts[dobIdx] || '';
            if (genderIdx !== -1) gender = parts[genderIdx] || '';
            if (houseIdx !== -1) house = parts[houseIdx] || '';
            if (clubIdx !== -1) club = parts[clubIdx] || '';
          } else {
            // Positional fallback
            if (parts.length <= 6) {
              // Legacy format: name, admissionNumber, level, section, parentPin, schoolFees
              name = parts[0] || '';
              admissionNumber = parts[1] || '';
              level = parts[2] || '';
              section = parts[3] || '';
              parentPin = parts[4] || '';
              schoolFees = Number(parts[5]) || 0;
            } else {
              // Full format: name, nameArabic, admissionNumber, level, section, academicYear, parentPin, schoolFees, dob, gender, house, club
              name = parts[0] || '';
              nameArabic = parts[1] || '';
              admissionNumber = parts[2] || '';
              level = parts[3] || '';
              section = parts[4] || '';
              academicYear = parts[5] || defaultAcademicYear;
              parentPin = parts[6] || '';
              schoolFees = Number(parts[7]) || 0;
              dob = parts[8] || '';
              gender = parts[9] || '';
              house = parts[10] || '';
              club = parts[11] || '';
            }
          }

          students.push({
            name,
            nameArabic,
            admissionNumber,
            level,
            section,
            academicYear,
            parentPin: parentPin || undefined,
            schoolFees,
            dob,
            gender,
            house,
            club
          });
        }
      }
    }

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Invalid payload. Expecting a list of students or csvData' });
    }

    const createdStudents = [];
    const skippedStudents = [];

    for (const stud of students) {
      const { admissionNumber, name, nameArabic, level, section, academicYear, parentPin, schoolFees, picture, dob, gender, house, club } = stud;

      if (!admissionNumber || !name || !level || !section || !academicYear) {
        skippedStudents.push({ ...stud, reason: 'Missing required fields' });
        continue;
      }

      const formattedAdmission = admissionNumber.trim().toUpperCase();
      const parsedSchoolFees = Number(schoolFees) || 0;
      
      const existing = await Student.findOne({ tenantId, admissionNumber: formattedAdmission });
      if (existing) {
        if (existing.isDeleted) {
          // Restore and update the soft-deleted student
          const generatedPin = parentPin || Math.floor(1000 + Math.random() * 9000).toString();
          existing.name = name;
          existing.nameArabic = nameArabic || '';
          existing.level = level;
          existing.section = section;
          existing.academicYear = academicYear;
          existing.parentPin = generatedPin;
          existing.schoolFees = parsedSchoolFees;
          if (dob !== undefined) (existing as any).dob = dob;
          if (gender !== undefined) (existing as any).gender = gender;
          if (house !== undefined) (existing as any).house = house;
          if (club !== undefined) (existing as any).club = club;
          existing.isDeleted = false;
          await existing.save();

          createdStudents.push({
            admissionNumber: formattedAdmission,
            name,
            level,
            section,
            academicYear,
            pin: generatedPin,
            schoolFees: parsedSchoolFees,
          });
          continue;
        }
        skippedStudents.push({ ...stud, reason: 'Admission number already exists' });
        continue;
      }

      // If parent PIN is not provided, generate a random 4-digit number
      const generatedPin = parentPin || Math.floor(1000 + Math.random() * 9000).toString();

      const newStudent = new Student({
        tenantId,
        admissionNumber: formattedAdmission,
        name,
        nameArabic: nameArabic || '',
        level,
        section,
        academicYear,
        parentPin: generatedPin, // Plain text PIN
        schoolFees: parsedSchoolFees,
        picture: picture || '',
        dob: dob || '',
        gender: gender || '',
        house: house || '',
        club: club || '',
      });

      await newStudent.save();
      createdStudents.push({
        admissionNumber: formattedAdmission,
        name,
        level,
        section,
        academicYear,
        pin: generatedPin, // return plain text pin so Admin can print/share it
        schoolFees: parsedSchoolFees,
      });
    }

    // Log action
    await AuditLog.create({
      tenantId,
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'STUDENTS_BULK_UPLOADED',
      resource: 'Student',
      description: `Bulk uploaded ${createdStudents.length} students. Skipped ${skippedStudents.length}.`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

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
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { level, section, page, limit } = req.query;
    const filter: any = { tenantId, isDeleted: { $ne: true } };
    if (level) filter.level = level;
    if (section) filter.section = section;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skipNum = (pageNum - 1) * limitNum;

    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .sort({ name: 1 })
      .skip(skipNum)
      .limit(limitNum);

    return res.status(200).json({
      students,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete student (and their results)
export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const student = await Student.findOneAndUpdate(
      { tenantId, _id: id },
      { isDeleted: true },
      { new: true }
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Log action
    await AuditLog.create({
      tenantId,
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'STUDENT_DELETED',
      resource: 'Student',
      resourceId: student._id,
      description: `Student ${student.name} soft-deleted`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update student
export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, admissionNumber, level, section, academicYear, parentPin, schoolFees, picture, dob, gender, house, club } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const student = await Student.findOne({ tenantId, _id: id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const oldState = student.toObject();

    if (admissionNumber) {
      const formattedAdmission = admissionNumber.trim().toUpperCase();
      if (formattedAdmission !== student.admissionNumber) {
        const existing = await Student.findOne({ tenantId, admissionNumber: formattedAdmission, isDeleted: { $ne: true } });
        if (existing) {
          return res.status(400).json({ message: 'Admission number already exists for another student' });
        }
        student.admissionNumber = formattedAdmission;
      }
    }

    if (name !== undefined) student.name = name;
    if (level !== undefined) student.level = level;
    if (section !== undefined) student.section = section;
    if (academicYear !== undefined) student.academicYear = academicYear;
    if (parentPin !== undefined) student.parentPin = parentPin;
    if (schoolFees !== undefined) student.schoolFees = Number(schoolFees) || 0;
    if (picture !== undefined) (student as any).picture = picture;
    if (dob !== undefined) (student as any).dob = dob;
    if (gender !== undefined) (student as any).gender = gender;
    if (house !== undefined) (student as any).house = house;
    if (club !== undefined) (student as any).club = club;

    await student.save();

    // Log action
    await AuditLog.create({
      tenantId,
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'STUDENT_UPDATED',
      resource: 'Student',
      resourceId: student._id,
      description: `Student ${student.name} updated`,
      changes: { before: oldState, after: student.toObject() },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({ message: 'Student updated successfully', student });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- Result Management ---

// Delete a specific result
export const deleteResult = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const result = await Result.findOneAndDelete({ tenantId, _id: id });
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    // Log action
    await AuditLog.create({
      tenantId,
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'RESULT_DELETED',
      resource: 'Result',
      resourceId: result._id,
      description: `Result sheet deleted for student ID ${result.studentId}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({ message: 'Result deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle result approval status
export const toggleResultApproval = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isApproved, headTeacherComments, nextTermBegins, nextTermSchoolFees } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const result = await Result.findOne({ tenantId, _id: id });
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }
    
    const oldState = result.toObject();

    // Toggle status or set based on isApproved boolean
    if (isApproved !== undefined) {
      result.status = isApproved ? 'approved' : 'draft';
    } else {
      result.status = result.status === 'approved' ? 'draft' : 'approved';
    }
    
    if (headTeacherComments !== undefined) {
      result.headTeacherComments = headTeacherComments;
    }
    
    if (nextTermBegins !== undefined) {
      result.nextTermBegins = nextTermBegins;
    }
    
    if (nextTermSchoolFees !== undefined) {
      result.nextTermSchoolFees = nextTermSchoolFees;
    }
    
    await result.save();

    // Log action
    await AuditLog.create({
      tenantId,
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: result.status === 'approved' ? 'RESULT_APPROVED' : 'RESULT_REVERTED_TO_DRAFT',
      resource: 'Result',
      resourceId: result._id,
      description: `Result status updated to "${result.status}"`,
      changes: { before: oldState, after: result.toObject() },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });
    
    return res.status(200).json({ message: 'Result status updated', result });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Administrator Profile credentials
export const updateAdminProfile = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id; // attached by authenticateToken middleware
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!tenantId || !adminId) {
      return res.status(401).json({ message: 'Unauthorized: missing tenantId or token user ID' });
    }

    const { username, name, password } = req.body;

    const admin = await User.findOne({ tenantId, _id: adminId });
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    const oldState = admin.toObject();

    if (username && username.trim() !== '') {
      const formattedUsername = username.trim().toLowerCase();
      // Ensure the new username isn't taken by someone else inside the same tenant
      const existing = await User.findOne({ tenantId, username: formattedUsername, _id: { $ne: adminId } });
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

    // Log action
    await AuditLog.create({
      tenantId,
      userId: admin._id,
      userName: admin.name,
      userRole: 'ADMIN',
      action: 'ADMIN_PROFILE_UPDATED',
      resource: 'User',
      resourceId: admin._id,
      description: 'Admin profile credentials updated',
      changes: { before: oldState, after: admin.toObject() },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

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
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { page, limit, term, academicYear } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skipNum = (pageNum - 1) * limitNum;

    const query: any = { tenantId };
    if (term) query.term = String(term);
    if (academicYear) query.academicYear = String(academicYear);

    const total = await Result.countDocuments(query);
    const results = await Result.find(query)
      .populate('studentId', 'name admissionNumber level section isDeleted picture')
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    return res.status(200).json({
      results,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching all results', error: error.message });
  }
};

// Retrieve administrator profile details
export const getAdminProfile = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!tenantId || !adminId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const admin = await User.findOne({ tenantId, _id: adminId, role: 'ADMIN' }).select('-password');
    if (!admin) {
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
    const tenantId = req.tenantId;
    const { title, message, targetRole } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const notification = new Notification({
      tenantId,
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
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const notifications = await Notification.find({ tenantId }).sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching notifications', error: error.message });
  }
};

// Delete a notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const n = await Notification.findOneAndDelete({ tenantId, _id: id });
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
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const notifications = await Notification.find({
      tenantId,
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
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const role = req.query.role as string;
    const filter: any = {
      tenantId,
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

// --- School Setup & Calendar Settings ---

// Get active school settings
export const getSchoolSettings = async (req: any, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Map tenant details to look like the legacy Settings model for frontend compatibility
    const settings = {
      key: 'school_info',
      tenantId: tenant._id.toString(),
      schoolName: tenant.name,
      schoolNameArabic: tenant.nameArabic,
      schoolSubHeader: tenant.subHeader,
      address: tenant.contact.address,
      phoneNumbers: tenant.contact.phoneNumbers,
      email: tenant.contact.email,
      bankName: tenant.academicConfig.bankDetails.bankName,
      accountName: tenant.academicConfig.bankDetails.accountName,
      accountNumber: tenant.academicConfig.bankDetails.accountNumber,
      currentAcademicYear: tenant.academicConfig.currentAcademicYear,
      currentTerm: tenant.academicConfig.currentTerm,
      annexes: tenant.academicConfig.annexes,
      accountantWhatsApp: tenant.academicConfig.accountantWhatsApp,
      logo: tenant.branding?.logo || '',
      islamicLogo: tenant.branding?.islamicLogo || '',
      curriculumType: tenant.curriculumType || 'dual',
      allowMultipleClassTeacherAssignments: tenant.academicConfig.allowMultipleClassTeacherAssignments || false,
      allowClassTeacherNextTermEdit: tenant.academicConfig.allowClassTeacherNextTermEdit !== false,
    };

    return res.status(200).json(settings);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error retrieving settings', error: error.message });
  }
};

// Update school settings
export const updateSchoolSettings = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'School not found' });
    }

    const {
      schoolName,
      schoolNameArabic,
      schoolSubHeader,
      address,
      phoneNumbers,
      email,
      bankName,
      accountName,
      accountNumber,
      currentAcademicYear,
      currentTerm,
      accountantWhatsApp,
      logo,
      islamicLogo,
      curriculumType,
      allowMultipleClassTeacherAssignments,
      allowClassTeacherNextTermEdit,
    } = req.body;

    const oldState = tenant.toObject();

    if (schoolName !== undefined) tenant.name = schoolName;
    if (schoolNameArabic !== undefined) tenant.nameArabic = schoolNameArabic;
    if (schoolSubHeader !== undefined) tenant.subHeader = schoolSubHeader;
    if (address !== undefined) tenant.contact.address = address;
    if (phoneNumbers !== undefined) tenant.contact.phoneNumbers = phoneNumbers;
    if (email !== undefined) tenant.contact.email = email;
    if (bankName !== undefined) tenant.academicConfig.bankDetails.bankName = bankName;
    if (accountName !== undefined) tenant.academicConfig.bankDetails.accountName = accountName;
    if (accountNumber !== undefined) tenant.academicConfig.bankDetails.accountNumber = accountNumber;
    if (currentAcademicYear !== undefined) tenant.academicConfig.currentAcademicYear = currentAcademicYear;
    if (currentTerm !== undefined) tenant.academicConfig.currentTerm = currentTerm;
    if (accountantWhatsApp !== undefined) tenant.academicConfig.accountantWhatsApp = accountantWhatsApp;
    if (logo !== undefined) {
      if (!tenant.branding) tenant.branding = {} as any;
      tenant.branding.logo = logo;
    }
    if (islamicLogo !== undefined) {
      if (!tenant.branding) tenant.branding = {} as any;
      tenant.branding.islamicLogo = islamicLogo;
    }
    if (curriculumType !== undefined) tenant.curriculumType = curriculumType;
    if (allowMultipleClassTeacherAssignments !== undefined) tenant.academicConfig.allowMultipleClassTeacherAssignments = allowMultipleClassTeacherAssignments;
    if (allowClassTeacherNextTermEdit !== undefined) tenant.academicConfig.allowClassTeacherNextTermEdit = allowClassTeacherNextTermEdit;

    await tenant.save();

    // Map back for frontend
    const settings = {
      key: 'school_info',
      schoolName: tenant.name,
      schoolNameArabic: tenant.nameArabic,
      schoolSubHeader: tenant.subHeader,
      address: tenant.contact.address,
      phoneNumbers: tenant.contact.phoneNumbers,
      email: tenant.contact.email,
      bankName: tenant.academicConfig.bankDetails.bankName,
      accountName: tenant.academicConfig.bankDetails.accountName,
      accountNumber: tenant.academicConfig.bankDetails.accountNumber,
      currentAcademicYear: tenant.academicConfig.currentAcademicYear,
      currentTerm: tenant.academicConfig.currentTerm,
      annexes: tenant.academicConfig.annexes,
      accountantWhatsApp: tenant.academicConfig.accountantWhatsApp,
      logo: tenant.branding?.logo || '',
      islamicLogo: tenant.branding?.islamicLogo || '',
      curriculumType: tenant.curriculumType || 'dual',
      allowMultipleClassTeacherAssignments: tenant.academicConfig.allowMultipleClassTeacherAssignments || false,
      allowClassTeacherNextTermEdit: tenant.academicConfig.allowClassTeacherNextTermEdit !== false,
    };

    // Log action
    await AuditLog.create({
      tenantId: tenant._id,
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'SETTINGS_UPDATED',
      resource: 'Tenant',
      resourceId: tenant._id,
      description: 'School settings updated',
      changes: { before: oldState, after: tenant.toObject() },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({ message: 'School settings updated successfully', settings });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error updating settings', error: error.message });
  }
};

// --- Class Promotions Manager ---

// Promote student profiles in batch from one level to another
export const promoteStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { studentIds, fromLevel, toLevel } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    if (!toLevel) {
      return res.status(400).json({ message: 'Target class level (toLevel) is required' });
    }

    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      // Promote specific selected students
      const result = await Student.updateMany(
        { tenantId, _id: { $in: studentIds }, isDeleted: { $ne: true } },
        { level: toLevel }
      );
      
      await AuditLog.create({
        tenantId,
        userId: req.user?.id,
        userName: req.user?.name || 'Admin',
        userRole: req.user?.role || 'ADMIN',
        action: 'STUDENTS_PROMOTED',
        resource: 'Student',
        description: `Promoted ${result.modifiedCount} specific students to level ${toLevel}`,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });

      return res.status(200).json({ message: `Successfully promoted ${result.modifiedCount} selected students to Level ${toLevel}.` });
    } else if (fromLevel) {
      // Promote all students from a level
      const result = await Student.updateMany(
        { tenantId, level: fromLevel, isDeleted: { $ne: true } },
        { level: toLevel }
      );

      await AuditLog.create({
        tenantId,
        userId: req.user?.id,
        userName: req.user?.name || 'Admin',
        userRole: req.user?.role || 'ADMIN',
        action: 'STUDENTS_PROMOTED_BY_LEVEL',
        resource: 'Student',
        description: `Promoted ${result.modifiedCount} students from level ${fromLevel} to level ${toLevel}`,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });

      return res.status(200).json({ message: `Successfully promoted ${result.modifiedCount} students from Level ${fromLevel} to Level ${toLevel}.` });
    } else {
      return res.status(400).json({ message: 'Please specify either studentIds array or fromLevel class level' });
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error executing student promotions', error: error.message });
  }
};

// --- School Class Management ---

// Create a new school class
export const createSchoolClass = async (req: AuthRequest, res: Response) => {
  try {
    const { className, section, annex, order } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    if (!className || !section) {
      return res.status(400).json({ message: 'Class name and section are required' });
    }

    // Check for duplicate within same annex
    const existing = await SchoolClass.findOne({
      tenantId,
      className: className.trim(),
      section: section.trim(),
      annex: (annex || '').trim(),
    });
    if (existing) {
      return res.status(400).json({ message: 'A class with this name already exists in this section/annex' });
    }

    const schoolClass = new SchoolClass({
      tenantId,
      className: className.trim(),
      section: section.trim(),
      annex: (annex || '').trim(),
      order: order ?? 0,
    });

    await schoolClass.save();
    return res.status(201).json({ message: 'Class created successfully', schoolClass });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error creating class', error: error.message });
  }
};

// List all school classes (with optional annex filter)
export const getSchoolClasses = async (req: any, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(200).json([]); // Return empty if no tenant resolved on public landing
    }

    const { annex, activeOnly } = req.query;
    const filter: any = { tenantId };
    if (annex) filter.annex = annex;
    if (activeOnly === 'true') filter.isActive = true;

    const classes = await SchoolClass.find(filter).sort({ section: 1, order: 1, className: 1 });
    return res.status(200).json(classes);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching classes', error: error.message });
  }
};

// Update a school class
export const updateSchoolClass = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { className, section, annex, order, isActive } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const schoolClass = await SchoolClass.findOne({ tenantId, _id: id });
    if (!schoolClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (className !== undefined) schoolClass.className = className.trim();
    if (section !== undefined) schoolClass.section = section.trim();
    if (annex !== undefined) schoolClass.annex = annex.trim();
    if (order !== undefined) schoolClass.order = order;
    if (isActive !== undefined) schoolClass.isActive = isActive;

    await schoolClass.save();
    return res.status(200).json({ message: 'Class updated successfully', schoolClass });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error updating class', error: error.message });
  }
};

// Delete a school class (hard delete)
export const deleteSchoolClass = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const schoolClass = await SchoolClass.findOneAndDelete({ tenantId, _id: id });
    if (!schoolClass) {
      return res.status(404).json({ message: 'Class not found' });
    }
    return res.status(200).json({ message: 'Class deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error deleting class', error: error.message });
  }
};

// Update annexes list in school settings
export const updateAnnexes = async (req: AuthRequest, res: Response) => {
  try {
    const { annexes } = req.body;
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    if (!Array.isArray(annexes)) {
      return res.status(400).json({ message: 'annexes must be an array of strings' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'School not found' });
    }

    tenant.academicConfig.annexes = annexes.map((a: string) => a.trim()).filter((a: string) => a.length > 0);
    await tenant.save();

    return res.status(200).json({ message: 'Annexes updated successfully', annexes: tenant.academicConfig.annexes });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error updating annexes', error: error.message });
  }
};

// --- Dynamic Subject CRUD Management ---

// Create a new subject
export const createSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, nameArabic, section } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    if (!name || !section) {
      return res.status(400).json({ message: 'Subject name and section category are required' });
    }

    const existing = await Subject.findOne({ tenantId, name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: 'A subject with this name already exists' });
    }

    const subject = new Subject({
      tenantId,
      name: name.trim(),
      nameArabic: (nameArabic || '').trim(),
      section,
    });

    await subject.save();
    return res.status(201).json({ message: 'Subject created successfully', subject });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error creating subject', error: error.message });
  }
};

// List all subjects (with optional active filter)
export const getSubjects = async (req: any, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(200).json([]); // Return empty if public call without subdomain
    }

    const { activeOnly } = req.query;
    const filter: any = { tenantId };
    if (activeOnly === 'true') filter.isActive = true;

    const subjects = await Subject.find(filter).sort({ section: 1, name: 1 });
    return res.status(200).json(subjects);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching subjects', error: error.message });
  }
};

// Update subject details
export const updateSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, nameArabic, section, isActive } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const subject = await Subject.findOne({ tenantId, _id: id });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (name !== undefined) subject.name = name.trim();
    if (nameArabic !== undefined) subject.nameArabic = nameArabic.trim();
    if (section !== undefined) subject.section = section;
    if (isActive !== undefined) subject.isActive = isActive;

    await subject.save();
    return res.status(200).json({ message: 'Subject updated successfully', subject });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error updating subject', error: error.message });
  }
};

// Delete subject (hard delete)
export const deleteSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const subject = await Subject.findOneAndDelete({ tenantId, _id: id });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    return res.status(200).json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error deleting subject', error: error.message });
  }
};
