import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import Result from '../models/Result';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import User from '../models/User';
import Tenant from '../models/Tenant';
import AIJob from '../models/AIJob';
import { enqueueAIJob } from '../services/aiQueueService';

const getSchoolSettings = async (tenantId: string) => {
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');
    return {
      schoolName: tenant.name,
      address: tenant.contact.address,
      phoneNumbers: tenant.contact.phoneNumbers,
      email: tenant.contact.email,
      bankName: tenant.academicConfig.bankDetails.bankName,
      accountName: tenant.academicConfig.bankDetails.accountName,
      accountNumber: tenant.academicConfig.bankDetails.accountNumber,
      currentAcademicYear: tenant.academicConfig.currentAcademicYear,
      currentTerm: tenant.academicConfig.currentTerm
    };
  } catch (err) {
    console.error('Settings lookup failed, using hardcoded defaults:', err);
    return {
      schoolName: 'Home of Young Huffaz Academy',
      address: 'Address complex, Takushara, Abuja, Nigeria',
      phoneNumbers: '+2348037322312, +2349033245467',
      email: 'info@younghuffaz.com',
      bankName: 'Huffaz Trust Bank',
      accountName: 'Home of Young Huffaz Academy',
      accountNumber: '1023456789',
      currentAcademicYear: '2025/2026',
      currentTerm: 'Second Term'
    };
  }
};

const callOpenRouter = async (messages: Array<{ role: string; content: string }>): Promise<string> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environmental variable is missing.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5000',
      'X-Title': 'SmartSchool Africa SaaS Platform',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
      messages,
      max_tokens: 400 // Limit tokens to prevent pre-auth credit checks from throwing 402 error
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content?.trim() || '';
};

// 1. Auto-generate report card feedback comments for Teachers
export const generateReportFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const settings = await getSchoolSettings(tenantId);
    let studentName = req.body.studentName || 'Student';
    let subjectsList = '';
    let averageGrade = 'C';
    let finalAverage = 60;
    let tahfeezhDetailsStr = '';

    const { studentId, academicYear, term, subjects } = req.body;

    if (subjects && Array.isArray(subjects)) {
      // 1. Generate directly from raw request data (e.g. from grading form state before submit)
      let totalScore = 0;
      let gradedCount = 0;
      subjectsList = subjects
        .filter((sub: any) => sub.isGraded)
        .map((sub: any) => {
          const score = (Number(sub.score60) || 0) + (Number(sub.score20_1) || 0) + (Number(sub.score20_2) || 0);
          totalScore += score;
          gradedCount++;
          let grade = 'F';
          if (score >= 80) grade = 'A';
          else if (score >= 70) grade = 'B';
          else if (score >= 60) grade = 'C';
          else if (score >= 50) grade = 'D';
          return `- ${sub.subjectName}: Score ${score}/100 (Grade ${grade})`;
        })
        .join('\n');

      if (gradedCount > 0) {
        finalAverage = Math.round(totalScore / gradedCount);
        if (finalAverage >= 80) averageGrade = 'A';
        else if (finalAverage >= 70) averageGrade = 'B';
        else if (finalAverage >= 60) averageGrade = 'C';
        else if (finalAverage >= 50) averageGrade = 'D';
        else averageGrade = 'F';
      }
    } else {
      // 2. Generate from existing database results
      if (!studentId || !academicYear || !term) {
        return res.status(400).json({ message: 'Missing required student details or subjects list' });
      }

      const result = await Result.findOne({ tenantId, studentId, academicYear, term }).populate('studentId');
      if (!result) {
        return res.status(404).json({ message: 'No graded results found for this student to analyze.' });
      }

      const student: any = result.studentId;
      if (student) {
        studentName = student.name;
      }
      subjectsList = result.subjects.map((sub: any) => 
        `- ${sub.subjectName} (${sub.section === 'tahfeezh' ? 'Tahfeezh' : 'Academic'}): Score ${sub.score100}/100 (Grade ${sub.grade || 'F'})`
      ).join('\n');
      finalAverage = result.finalAverage;
      averageGrade = result.generalGrade;
      tahfeezhDetailsStr = `
      Tahfeezh Progress:
      - Memorized pages: ${result.tahfeezhDetails?.memorizedPages || 0} pages
      - Surah Range: From "${result.tahfeezhDetails?.fromSurah || 'N/A'}" to "${result.tahfeezhDetails?.toSurah || 'N/A'}"
      - Missed Hifz sessions: ${result.tahfeezhDetails?.absenceOfHifz || 0} times
      `;
    }

    // Build structured messages (system + user) to avoid prompt injection and allow safer templating
    const systemMessage = {
      role: 'system',
      content: `You are a concise report-comment assistant for school report cards. Always return ONLY the required comment text, no metadata, no explanations.`
    };

    const userPayload = {
      instruction: 'generate_report_feedback',
      school: { name: settings.schoolName },
      constraints: { maxWords: 25, language: 'English', includeIslamicBlessings: true },
      student: { name: studentName, averageGrade, finalAverage },
      gradesText: subjectsList,
      tahfeezh: tahfeezhDetailsStr
    };

    const messages = [systemMessage, { role: 'user', content: JSON.stringify(userPayload) }];
    const promptKey = JSON.stringify(messages);

    const job = await enqueueAIJob(
      tenantId,
      req.user?.id || null,
      'report_feedback',
      { studentName, averageGrade, finalAverage },
      promptKey,
      () => callOpenRouter(messages)
    );

    return res.status(202).json({
      message: 'Report feedback generation job enqueued.',
      jobId: job._id,
      status: job.status,
      // Backward compatibility fallbacks if cached/finished instantly
      comment: job.status === 'completed' ? job.result : undefined,
      feedback: job.status === 'completed' ? job.result : undefined
    });
  } catch (error: any) {
    console.error('AI Report Feedback Error:', error);
    return res.status(500).json({ message: 'Server error generating feedback', error: error.message });
  }
};

// 2. Auto-generate financial briefing for Accountants
export const generateFinancialForecast = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { term, academicYear } = req.query;
    const settings = await getSchoolSettings(tenantId);
    
    const filterTerm = (term as string) || settings.currentTerm || 'First Term';
    const filterYear = (academicYear as string) || settings.currentAcademicYear || '2025/2026';

    const activeStudents = await Student.find({ tenantId, isDeleted: { $ne: true }, academicYear: filterYear });
    const totalExpected = activeStudents.reduce((sum, s: any) => sum + (s.schoolFees || 0), 0);

    const invoices = await Invoice.find({ tenantId, term: filterTerm, academicYear: filterYear });
    let totalInvoiced = 0;
    let totalPaid = 0;
    invoices.forEach((inv) => {
      totalInvoiced += inv.amount;
      totalPaid += inv.paidAmount;
    });

    const expenses = await Expense.find({ tenantId, term: filterTerm, academicYear: filterYear });
    let totalExpenses = 0;
    expenses.forEach((exp) => {
      totalExpenses += exp.amount;
    });

    const outstandingFees = totalExpected - totalPaid;
    const currentBalance = totalPaid - totalExpenses;

    const systemMessage = { role: 'system', content: 'You are an experienced financial analyst. Provide clear, actionable financial briefings in Markdown.' };
    const userPayload = {
      instruction: 'finance_forecast',
      school: { name: settings.schoolName },
      period: { term: filterTerm, academicYear: filterYear },
      metrics: {
        totalExpected,
        totalInvoiced,
        totalPaid,
        outstandingFees,
        totalExpenses,
        currentBalance
      },
      constraints: { format: 'markdown', lengthWords: [150, 200] }
    };
    const messages = [systemMessage, { role: 'user', content: JSON.stringify(userPayload) }];
    const promptKey = JSON.stringify(messages);

    const job = await enqueueAIJob(
      tenantId,
      req.user?.id || null,
      'finance_forecast',
      { term: filterTerm, academicYear: filterYear },
      promptKey,
      () => callOpenRouter(messages)
    );

    return res.status(202).json({
      message: 'Financial forecast generation job enqueued.',
      jobId: job._id,
      status: job.status,
      forecast: job.status === 'completed' ? job.result : undefined
    });
  } catch (error: any) {
    console.error('AI Financial Forecast Error:', error);
    return res.status(500).json({ message: 'Server error generating financial forecast', error: error.message });
  }
};

// 3. Auto-generate Executive Briefing for Director
export const generateExecutiveBriefing = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { term, academicYear } = req.query;
    const settings = await getSchoolSettings(tenantId);
    
    const filterTerm = (term as string) || settings.currentTerm || 'First Term';
    const filterYear = (academicYear as string) || settings.currentAcademicYear || '2025/2026';

    const activeStudentsCount = await Student.countDocuments({ tenantId, isDeleted: { $ne: true }, academicYear: filterYear });
    const teachersCount = await User.countDocuments({ tenantId, role: 'TEACHER' });

    const invoices = await Invoice.find({ tenantId, term: filterTerm, academicYear: filterYear });
    let totalPaid = 0;
    invoices.forEach((inv) => {
      totalPaid += inv.paidAmount;
    });
    const expenses = await Expense.find({ tenantId, term: filterTerm, academicYear: filterYear });
    let totalExpenses = 0;
    expenses.forEach((exp) => {
      totalExpenses += exp.amount;
    });
    const netBalance = totalPaid - totalExpenses;

    const results = await Result.find({ tenantId, term: filterTerm, academicYear: filterYear });
    let totalGPA = 0;
    results.forEach((r) => {
      totalGPA += r.finalAverage;
    });
    const averageScore = results.length > 0 ? (totalGPA / results.length).toFixed(1) : 'N/A';

    const systemMessage = { role: 'system', content: 'You are a strategic education consultant. Produce an executive briefing in Markdown with clear recommendations.' };
    const userPayload = {
      instruction: 'director_briefing',
      school: { name: settings.schoolName },
      period: { term: filterTerm, academicYear: filterYear },
      metrics: {
        activeStudentsCount,
        teachersCount,
        studentTeacherRatio: (activeStudentsCount / (teachersCount || 1)).toFixed(1),
        averageScore,
        totalPaid,
        totalExpenses,
        netBalance
      },
      constraints: { format: 'markdown', lengthWords: [150, 200] }
    };
    const messages = [systemMessage, { role: 'user', content: JSON.stringify(userPayload) }];
    const promptKey = JSON.stringify(messages);

    const job = await enqueueAIJob(
      tenantId,
      req.user?.id || null,
      'director_briefing',
      { term: filterTerm, academicYear: filterYear },
      promptKey,
      () => callOpenRouter(messages)
    );

    return res.status(202).json({
      message: 'Director executive briefing generation job enqueued.',
      jobId: job._id,
      status: job.status,
      briefing: job.status === 'completed' ? job.result : undefined
    });
  } catch (error: any) {
    console.error('AI Executive Briefing Error:', error);
    return res.status(500).json({ message: 'Server error generating executive briefing', error: error.message });
  }
};

// 4. Auto-generate Head Teacher / Principal feedback comments
export const generateHeadTeacherFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const settings = await getSchoolSettings(tenantId);
    const { studentName, finalAverage, generalGrade, subjects } = req.body;
    
    let subjectsList = '';
    if (subjects && Array.isArray(subjects)) {
      subjectsList = subjects
        .map((sub: any) => `- ${sub.subjectName}: Grade ${sub.grade || 'F'} (Score ${sub.score100 || 0}/100)`)
        .join('\n');
    }

    const systemMessage = { role: 'system', content: 'You are a concise Head Teacher comment generator. Return only the comment (max 25 words).' };
    const userPayload = {
      instruction: 'head_teacher_feedback',
      school: { name: settings.schoolName },
      student: { name: studentName, finalAverage, generalGrade },
      gradesText: subjectsList,
      constraints: { maxWords: 25, language: 'English', includeIslamicBlessings: true }
    };
    const messages = [systemMessage, { role: 'user', content: JSON.stringify(userPayload) }];
    const promptKey = JSON.stringify(messages);

    const job = await enqueueAIJob(
      tenantId,
      req.user?.id || null,
      'head_teacher_feedback',
      { studentName, finalAverage, generalGrade },
      promptKey,
      () => callOpenRouter(messages)
    );

    return res.status(202).json({
      message: 'Head Teacher feedback generation job enqueued.',
      jobId: job._id,
      status: job.status,
      comment: job.status === 'completed' ? job.result : undefined
    });
  } catch (error: any) {
    console.error('AI Head Teacher Feedback Error:', error);
    return res.status(500).json({ message: 'Server error generating head teacher feedback', error: error.message });
  }
};

/**
 * GET /api/ai/job/:jobId
 * Returns the status and result of a background AI generation job.
 */
export const getAIJobStatus = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { jobId } = req.params;
    const job = await AIJob.findOne({ _id: jobId, tenantId });
    if (!job) {
      return res.status(404).json({ message: 'AI Job not found' });
    }

    return res.status(200).json({
      jobId: job._id,
      status: job.status,
      taskType: job.taskType,
      result: job.result,
      error: job.error
    });
  } catch (error: any) {
    console.error('getAIJobStatus error:', error);
    return res.status(500).json({ message: 'Failed to retrieve job status', error: error.message });
  }
};

/**
 * GET /api/ai/at-risk
 * Scans students in the current term against their previous term averages to identify those
 * whose grades dropped by more than 5%. Generates AI study recommendations.
 */
export const detectAtRiskStudents = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const settings = await getSchoolSettings(tenantId);
    const currentYear = req.query.academicYear as string || settings.currentAcademicYear;
    const currentTerm = req.query.term as string || settings.currentTerm;

    // Determine previous term
    let prevTerm = 'First Term';
    if (currentTerm === 'Third Term') prevTerm = 'Second Term';
    else if (currentTerm === 'Second Term') prevTerm = 'First Term';

    // Find all results for current term
    const currentResults = await Result.find({ tenantId, academicYear: currentYear, term: currentTerm }).populate('studentId');
    const atRiskList: any[] = [];

    for (const r of currentResults) {
      const student: any = r.studentId;
      if (!student) continue;

      // Find previous term result for comparison
      const prevResult = await Result.findOne({
        tenantId,
        studentId: student._id,
        academicYear: currentYear,
        term: prevTerm
      });

      if (prevResult) {
        const diff = prevResult.finalAverage - r.finalAverage;
        if (diff >= 5) { // Grade dropped by 5% or more
          // Enqueue or return details
          atRiskList.push({
            studentId: student._id,
            name: student.name,
            admissionNumber: student.admissionNumber,
            level: student.level,
            section: student.section,
            currentAverage: r.finalAverage,
            previousAverage: prevResult.finalAverage,
            dropPercentage: diff.toFixed(1)
          });
        }
      }
    }

    if (atRiskList.length === 0) {
      return res.status(200).json({
        message: 'No students identified with declining grade trends of 5% or more.',
        students: []
      });
    }

    // Generate group advice block prompt
    const studentsSummary = atRiskList.map(s => `- ${s.name} (Grade average dropped from ${s.previousAverage}% to ${s.currentAverage}%)`).join('\n');
    const systemMessage = { role: 'system', content: 'You are an educational psychologist and strategic consultant. Provide concise, practical teacher-facing recommendations.' };
    const userPayload = {
      instruction: 'at_risk_detection',
      school: { name: settings.schoolName },
      period: { term: currentTerm, academicYear: currentYear },
      flaggedStudents: atRiskList,
      constraints: { lengthWords: [100, 150], recommendations: 3 }
    };
    const messages = [systemMessage, { role: 'user', content: JSON.stringify(userPayload) }];
    const promptKey = JSON.stringify(messages);

    // Enqueue LLM job
    const job = await enqueueAIJob(
      tenantId,
      req.user?.id || null,
      'at_risk_detection',
      { currentTerm, currentYear, count: atRiskList.length },
      promptKey,
      () => callOpenRouter(messages)
    );

    return res.status(202).json({
      message: `Identified ${atRiskList.length} students at risk. AI recommendation strategy enqueued.`,
      jobId: job._id,
      status: job.status,
      flaggedStudents: atRiskList
    });
  } catch (error: any) {
    console.error('detectAtRiskStudents error:', error);
    return res.status(500).json({ message: 'Failed to analyze at-risk students', error: error.message });
  }
};

/**
 * POST /api/ai/class-summary
 * Compiles a class's result averages and enqueues a background summary briefing.
 */
export const generateClassScoreSummary = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { level, section, term, academicYear } = req.body;
    if (!level || !section || !term || !academicYear) {
      return res.status(400).json({ message: 'Missing level, section, term or academicYear in request body' });
    }

    const settings = await getSchoolSettings(tenantId);
    
    // Find all results in this class section
    const results = await Result.find({ tenantId, level, section, term, academicYear }).populate('studentId');
    if (results.length === 0) {
      return res.status(404).json({ message: 'No graded student results found in this class section' });
    }

    let totalScore = 0;
    let highestAverage = 0;
    let highestScorerName = 'N/A';

    results.forEach((r) => {
      totalScore += r.finalAverage;
      if (r.finalAverage > highestAverage) {
        highestAverage = r.finalAverage;
        highestScorerName = typeof r.studentId === 'object' && r.studentId ? (r.studentId as any).name : 'Student';
      }
    });

    const classAverage = (totalScore / results.length).toFixed(1);

    const systemMessage = { role: 'system', content: 'You are an academic auditor assistant. Provide short class-level summaries and suggestions in Markdown.' };
    const userPayload = {
      instruction: 'class_summary',
      school: { name: settings.schoolName },
      period: { term, academicYear },
      class: { level, section },
      metrics: { totalStudents: results.length, classAverage, highestAverage, highestScorerName },
      constraints: { format: 'markdown', lengthWords: [100, 120] }
    };
    const messages = [systemMessage, { role: 'user', content: JSON.stringify(userPayload) }];
    const promptKey = JSON.stringify(messages);

    // Enqueue LLM job
    const job = await enqueueAIJob(
      tenantId,
      req.user?.id || null,
      'class_summary',
      { level, section, term, academicYear },
      promptKey,
      () => callOpenRouter(messages)
    );

    return res.status(202).json({
      message: 'Class performance summary enqueued successfully.',
      jobId: job._id,
      status: job.status,
      metrics: {
        totalStudents: results.length,
        classAverage,
        highestAverage,
        highestScorerName
      }
    });
  } catch (error: any) {
    console.error('generateClassScoreSummary error:', error);
    return res.status(500).json({ message: 'Failed to generate class score summary', error: error.message });
  }
};
