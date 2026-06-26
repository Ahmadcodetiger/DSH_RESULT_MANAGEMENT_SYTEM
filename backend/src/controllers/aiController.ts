import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import Result from '../models/Result';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import User from '../models/User';
import Settings from '../models/Settings';

const getSchoolSettings = async () => {
  try {
    let settings = await Settings.findOne({ key: 'school_info' });
    if (!settings) {
      settings = new Settings({ key: 'school_info' });
      await settings.save();
    }
    return settings;
  } catch (err) {
    console.error('Settings lookup failed, using hardcoded defaults:', err);
    return {
      schoolName: 'Home of Young Huffaz Academy',
      address: 'Address complex, Takushara, Abuja, Nigeria',
      phoneNumbers: '+2348037322312, +2349033245467',
      email: 'info@younghuffaz.com',
      bankName: 'Huffaz Trust Bank',
      accountName: 'Home of Young Huffaz Academy',
      accountNumber: '1023456789'
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
      'X-Title': 'DSH Result Management System',
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
    const settings = await getSchoolSettings();
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

      const result = await Result.findOne({ studentId, academicYear, term }).populate('studentId');
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

    const responseText = await callOpenRouter(prompt);
    return res.status(200).json({ comment: responseText, feedback: responseText });
  } catch (error: any) {
    console.error('AI Report Feedback Error:', error);
    return res.status(500).json({ message: 'Server error generating feedback', error: error.message });
  }
};

// 2. Auto-generate financial briefing for Accountants
export const generateFinancialForecast = async (req: AuthRequest, res: Response) => {
  try {
    const { term, academicYear } = req.query;
    const settings = await getSchoolSettings();
    const filterTerm = (term as string) || (settings as any).currentTerm || 'First Term';
    const filterYear = (academicYear as string) || (settings as any).currentAcademicYear || '2025/2026';

    const activeStudents = await Student.find({ isDeleted: { $ne: true }, academicYear: filterYear });
    const totalExpected = activeStudents.reduce((sum, s: any) => sum + (s.schoolFees || 0), 0);

    const invoices = await Invoice.find({ term: filterTerm, academicYear: filterYear });
    let totalInvoiced = 0;
    let totalPaid = 0;
    invoices.forEach((inv) => {
      totalInvoiced += inv.amount;
      totalPaid += inv.paidAmount;
    });

    const expenses = await Expense.find({ term: filterTerm, academicYear: filterYear });
    let totalExpenses = 0;
    expenses.forEach((exp) => {
      totalExpenses += exp.amount;
    });

    const outstandingFees = totalExpected - totalPaid;
    const currentBalance = totalPaid - totalExpenses;

    const prompt = `
      You are a senior financial AI advisor. Generate a concise financial briefing and cash flow outlook (150-200 words) for the accountant of ${(settings as any).schoolName} based on the following metrics:
      
      Financial Metrics (for ${filterTerm} / Academic Year ${filterYear}):
      - Total Expected Fees (from Student Files): ₦${totalExpected.toLocaleString()}
      - Total Invoiced Fees: ₦${totalInvoiced.toLocaleString()}
      - Total Fees Collected: ₦${totalPaid.toLocaleString()}
      - Outstanding Fees (Expected - Collected): ₦${outstandingFees.toLocaleString()}
      - Total Expenses: ₦${totalExpenses.toLocaleString()}
      - Net Balance (Money on Ground): ₦${currentBalance.toLocaleString()}

      Write a structured advice briefing. Underline the current collection efficiency (Paid/Expected percentage), assess reserves vs expenses, and suggest 2 concrete actions to recover outstanding fees. Format with clear Markdown paragraphs.
    `;

    const responseText = await callOpenRouter(prompt);
    return res.status(200).json({ forecast: responseText });
  } catch (error: any) {
    console.error('AI Financial Forecast Error:', error);
    return res.status(500).json({ message: 'Server error generating financial forecast', error: error.message });
  }
};

// 3. Auto-generate Executive Briefing for Director
export const generateExecutiveBriefing = async (req: AuthRequest, res: Response) => {
  try {
    const { term, academicYear } = req.query;
    const settings = await getSchoolSettings();
    const filterTerm = (term as string) || (settings as any).currentTerm || 'First Term';
    const filterYear = (academicYear as string) || (settings as any).currentAcademicYear || '2025/2026';

    const activeStudentsCount = await Student.countDocuments({ isDeleted: { $ne: true }, academicYear: filterYear });
    const teachersCount = await User.countDocuments({ role: 'TEACHER' });

    const invoices = await Invoice.find({ term: filterTerm, academicYear: filterYear });
    let totalPaid = 0;
    invoices.forEach((inv) => {
      totalPaid += inv.paidAmount;
    });
    const expenses = await Expense.find({ term: filterTerm, academicYear: filterYear });
    let totalExpenses = 0;
    expenses.forEach((exp) => {
      totalExpenses += exp.amount;
    });
    const netBalance = totalPaid - totalExpenses;

    const results = await Result.find({ term: filterTerm, academicYear: filterYear });
    let totalGPA = 0;
    results.forEach((r) => {
      totalGPA += r.finalAverage;
    });
    const averageScore = results.length > 0 ? (totalGPA / results.length).toFixed(1) : 'N/A';

    const prompt = `
      You are a strategic education consultant AI. Write an executive briefing (150-200 words) for the Director/Proprietor of ${(settings as any).schoolName} using these school metrics for ${filterTerm} (Academic Year ${filterYear}):
      
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

    const responseText = await callOpenRouter(prompt);
    return res.status(200).json({ briefing: responseText });
  } catch (error: any) {
    console.error('AI Executive Briefing Error:', error);
    return res.status(500).json({ message: 'Server error generating executive briefing', error: error.message });
  }
};
