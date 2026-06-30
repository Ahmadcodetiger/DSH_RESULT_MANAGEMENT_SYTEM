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

const callOpenRouter = async (prompt: string): Promise<string> => {
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
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
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

    const prompt = `
      You are an AI assistant helping a teacher at ${settings.schoolName}, an Islamic dual-curriculum school.
      Generate a professional, warm, and highly personalized report card comment (strictly maximum 25 words) for the student based on their performance details below.
      The comment must be written in English, include Islamic terms of encouragement (e.g. "Masha Allah", "Barakallah Feek/Feeki", "May Allah increase you in knowledge"), and offer constructive advice.
      It MUST be extremely brief (strictly maximum 25 words) so that the printed report sheet fits on a single A4 page.

      Student Details:
      - Name: ${studentName}
      - General Average Grade: ${averageGrade} (${finalAverage}%)
      
      Grades:
      ${subjectsList}
      ${tahfeezhDetailsStr}

      Provide ONLY the raw comment text, with no extra quotes or introduction.
    `;

    const job = await enqueueAIJob(
      tenantId,
      req.user?.id || null,
      'report_feedback',
      { studentName, averageGrade, finalAverage },
      prompt,
      () => callOpenRouter(prompt)
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

    const prompt = `
      You are a senior financial AI advisor. Generate a concise financial briefing and cash flow outlook (150-200 words) for the accountant of ${settings.schoolName} based on the following metrics:
      
      Financial Metrics (for ${filterTerm} / Academic Year ${filterYear}):
      - Total Expected Fees (from Student Files): ₦${totalExpected.toLocaleString()}
      - Total Invoiced Fees: ₦${totalInvoiced.toLocaleString()}
      - Total Fees Collected: ₦${totalPaid.toLocaleString()}
      - Outstanding Fees (Expected - Collected): ₦${outstandingFees.toLocaleString()}
      - Total Expenses: ₦${totalExpenses.toLocaleString()}
      - Net Balance (Money on Ground): ₦${currentBalance.toLocaleString()}

      Write a structured advice briefing. Underline the current collection efficiency (Paid/Expected percentage), assess reserves vs expenses, and suggest 2 concrete actions to recover outstanding fees. Format with clear Markdown paragraphs.
    `;

    const job = await enqueueAIJob(
      tenantId,
      req.user?.id || null,
      'finance_forecast',
      { term: filterTerm, academicYear: filterYear },
      prompt,
      () => callOpenRouter(prompt)
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

    const prompt = `
      You are a strategic education consultant AI. Write an executive briefing (150-200 words) for the Director/Proprietor of ${settings.schoolName} using these school metrics for ${filterTerm} (Academic Year ${filterYear}):
      
      School Overview:
      - Active Students: ${activeStudentsCount}
      - Staff count (Teachers): ${teachersCount}
      - Student-Teacher Ratio: ${(activeStudentsCount / (teachersCount || 1)).toFixed(1)}
      - School average score (GPA): ${averageScore}%
      - Collected Revenue: ₦${totalPaid.toLocaleString()}
      - Operating Costs: ₦${totalExpenses.toLocaleString()}
      - Current Balance: ₦${netBalance.toLocaleString()}

      Outline key recommendations for resource allocation, class performance, and teacher workload optimization. Be professional, supportive, and strategic. Format in clean Markdown.
    `;

    const job = await enqueueAIJob(
      tenantId,
      req.user?.id || null,
      'director_briefing',
      { term: filterTerm, academicYear: filterYear },
      prompt,
      () => callOpenRouter(prompt)
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

    const prompt = `
      You are an AI assistant helping the Head Teacher / Principal of ${settings.schoolName}, an Islamic dual-curriculum school.
      Generate a professional, warm, and authoritative Head Teacher report card comment (strictly maximum 25 words) for the student based on their final average performance.
      The comment must be written in English, sound encouraging yet academic, include short Islamic blessings (e.g. "Masha Allah", "Barakallah Feek/Feeki", "May Allah bless your efforts"), and give a brief recommendation to keep up or improve their scores.
      It MUST be extremely brief (strictly maximum 25 words) so that the printed report sheet fits on a single A4 page.

      Student Details:
      - Name: ${studentName}
      - Final average: ${finalAverage}%
      - General grade: ${generalGrade}
      
      Grades:
      ${subjectsList}

      Provide ONLY the raw comment text, with no extra quotes or introduction.
    `;

    const job = await enqueueAIJob(
      tenantId,
      req.user?.id || null,
      'head_teacher_feedback',
      { studentName, finalAverage, generalGrade },
      prompt,
      () => callOpenRouter(prompt)
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
    const prompt = `
      You are an expert educational psychologist and director consultant.
      We have analyzed student report card statistics for this term and flagged the following students with declining performance trends:
      
      Flagged Students:
      ${studentsSummary}

      Draft a short, highly professional strategic overview (100-150 words) with 3 key actionable recommendations for teachers and counselors to support these struggling students.
    `;

    // Enqueue LLM job
    const job = await enqueueAIJob(
      tenantId,
      req.user?.id || null,
      'at_risk_detection',
      { currentTerm, currentYear, count: atRiskList.length },
      prompt,
      () => callOpenRouter(prompt)
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

    const prompt = `
      You are an academic auditor AI assisting the director of ${settings.schoolName}.
      Provide a brief summary briefing (100-120 words) analyzing the performance of Level "${level}" Section "${section}" for "${term}" (${academicYear}):
      
      Class Metrics:
      - Total graded students: ${results.length}
      - Class Average Score: ${classAverage}%
      - Highest Average: ${highestAverage}% achieved by ${highestScorerName}

      Summarize general academic performance (are they doing well or average?), suggest which areas require review, and provide encouragement. Format in markdown.
    `;

    // Enqueue LLM job
    const job = await enqueueAIJob(
      tenantId,
      req.user?.id || null,
      'class_summary',
      { level, section, term, academicYear },
      prompt,
      () => callOpenRouter(prompt)
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
