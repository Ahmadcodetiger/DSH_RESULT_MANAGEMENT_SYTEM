import { Response } from 'express';
import puppeteer from 'puppeteer-core';
// @ts-ignore
import chromium from '@sparticuz/chromium';
import { AuthRequest } from '../middleware/auth';
import Result from '../models/Result';
import Student from '../models/Student';
import User from '../models/User';
import { SCHOOL_LOGO_BASE64 } from './logoBase64';

// Helper to escape HTML characters for security (XSS prevention)
const escapeHtml = (unsafe: any): string => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Helper to generate the HTML string
const generateReportHtml = (result: any, student: any) => {
  const renderSubjectRows = (subjects: any[]) => {
    return subjects.map((sub: any) => {
      if (!sub.isGraded) {
        return `
          <tr>
            <td class="bilingual-cell">
              <span class="en">${escapeHtml(sub.subjectName)}</span>
              <span class="ar">${escapeHtml(sub.subjectNameArabic)}</span>
            </td>
            <td class="center muted">—</td>
            <td class="center muted">—</td>
            <td class="center muted">—</td>
            <td class="center muted">—</td>
            <td class="center muted">—</td>
          </tr>
        `;
      }

      return `
        <tr>
          <td class="bilingual-cell">
            <span class="en">${escapeHtml(sub.subjectName)}</span>
            <span class="ar">${escapeHtml(sub.subjectNameArabic)}</span>
          </td>
          <td class="center font-bold grade-cell">${escapeHtml(sub.grade || 'F')}</td>
          <td class="center">${escapeHtml(sub.score100)}</td>
          <td class="center">${escapeHtml(sub.score60)}</td>
          <td class="center">${escapeHtml(sub.score20_1)}</td>
          <td class="center">${escapeHtml(sub.score20_2)}</td>
        </tr>
      `;
    }).join('');
  };

  const tahfeezhSubjects = result.subjects.filter((s: any) => s.section === 'tahfeezh' || ["Al-Qur'an Karem (Hifz)", "Al-Qur'an (Writing)", "Arabic", "Grammar VERBAL", "Islamic Subjects"].includes(s.subjectName));
  const academicSubjects = result.subjects.filter((s: any) => !tahfeezhSubjects.includes(s));

  const tahfeezhRows = renderSubjectRows(tahfeezhSubjects);
  const academicRows = renderSubjectRows(academicSubjects);

  // Map evaluation elements to rows
  const evaluationRows = result.evaluationElements.map((el: any) => {
    return `
      <tr>
        <td class="bilingual-cell small-text">
          <span class="en">${escapeHtml(el.elementLabel)}</span>
          <span class="ar">${escapeHtml(el.elementLabelArabic)}</span>
        </td>
        <td class="center ar font-bold" style="font-size: 13px;">${escapeHtml(el.rating || '')}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Report Sheet - ${escapeHtml(student.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;500;600;700&family=Amiri:wght@400;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Inter', 'Cairo', sans-serif;
          color: #1a1a1a;
          background: #ffffff;
          padding: 8px;
          font-size: 10.5px;
          line-height: 1.35;
          -webkit-print-color-adjust: exact;
        }
        .outer-border {
          border: 3px solid #1E5631;
          padding: 14px;
          width: 100%;
          min-height: 275mm;
          position: relative;
        }
        
        /* ── Header ── */
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2.5px solid #1E5631;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .header-logo {
          width: 68px;
          height: 68px;
          object-fit: contain;
          border-radius: 6px;
        }
        .header-text {
          text-align: center;
          flex-grow: 1;
          padding: 0 10px;
        }
        .header-text h1 {
          font-family: 'Cairo', sans-serif;
          font-size: 20px;
          color: #1E5631;
          margin-bottom: 1px;
          font-weight: 700;
        }
        .header-text h2 {
          font-size: 14px;
          color: #1a1a1a;
          margin-bottom: 2px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .header-text p.sub {
          font-size: 7.5px;
          font-weight: 600;
          color: #555;
          text-transform: uppercase;
          margin-bottom: 2px;
          letter-spacing: 0.3px;
        }
        .header-text p.contact {
          font-size: 7px;
          color: #888;
        }

        /* ── Student info table ── */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        .info-table td {
          border: 1px solid #b8c9b8;
          padding: 5px 7px;
          width: 33.33%;
          vertical-align: middle;
          background: #fafcfa;
        }
        .bilingual-cell {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .en {
          font-family: 'Inter', sans-serif;
          text-align: left;
          font-size: 10px;
        }
        .ar {
          font-family: 'Cairo', sans-serif;
          text-align: right;
          direction: rtl;
          font-size: 10px;
          color: #555;
        }
        .val-text {
          font-weight: 700;
          color: #1E5631;
          margin-left: 4px;
          font-size: 12px;
        }
        .muted {
          color: #bbb;
          font-size: 10px;
        }

        /* ── Section headers ── */
        .section-heading {
          background: #1E5631;
          color: #fff;
          padding: 5px 10px;
          font-weight: 700;
          font-size: 10.5px;
          margin-bottom: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .section-heading .ar {
          color: rgba(255,255,255,0.85);
        }
        .sub-heading {
          color: #1E5631;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 3px;
          margin-top: 6px;
          padding-bottom: 2px;
          border-bottom: 1px solid #d4af37;
          display: inline-block;
        }

        /* ── Results table ── */
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        .results-table th, .results-table td {
          border: 1px solid #c5d5c5;
          padding: 4px 5px;
        }
        .results-table th {
          background: #eef4ee;
          color: #1E5631;
          font-size: 9px;
          font-weight: 700;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }
        .results-table td {
          font-size: 10.5px;
        }
        .results-table td.center {
          text-align: center;
        }
        .font-bold {
          font-weight: 700;
        }
        .grade-cell {
          color: #1E5631;
          font-size: 12px;
        }

        /* ── Tahfeezh Progress block ── */
        .tahfeezh-section {
          display: grid;
          grid-template-columns: 1fr 1fr 2fr 1fr;
          gap: 0;
          border: 1px solid #c5d5c5;
          margin-bottom: 8px;
          border-radius: 2px;
          overflow: hidden;
        }
        .tahfeezh-col {
          border-right: 1px solid #c5d5c5;
          padding: 5px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .tahfeezh-col:last-child {
          border-right: none;
        }
        .tahfeezh-title {
          font-size: 8px;
          color: #1E5631;
          font-weight: 700;
          text-align: center;
          border-bottom: 1px solid #e8ede8;
          padding-bottom: 3px;
          margin-bottom: 4px;
        }
        .tahfeezh-val {
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: #1E5631;
        }

        /* ── Totals Block ── */
        .totals-section {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          border: 1px solid #c5d5c5;
          margin-bottom: 8px;
          border-radius: 2px;
          overflow: hidden;
        }
        .total-box {
          border-right: 1px solid #c5d5c5;
          padding: 6px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .total-box:last-child {
          border-right: none;
        }
        .total-title {
          font-size: 8px;
          color: #1E5631;
          font-weight: 700;
          text-align: center;
          border-bottom: 1px solid #e8ede8;
          padding-bottom: 3px;
          margin-bottom: 4px;
        }
        .total-val {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          color: #1E5631;
        }
        .recommendation-text {
          font-family: 'Amiri', serif;
          font-size: 14px;
          color: #1E5631;
          text-align: center;
          margin-top: 4px;
          font-style: italic;
        }

        /* ── Evaluations and Criteria ── */
        .eval-criteria-container {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }
        .eval-table, .criteria-table {
          width: 100%;
          border-collapse: collapse;
        }
        .eval-table th, .eval-table td, .criteria-table th, .criteria-table td {
          border: 1px solid #c5d5c5;
          padding: 3px 5px;
        }
        .eval-table th, .criteria-table th {
          background: #eef4ee;
          color: #1E5631;
          font-size: 8.5px;
          text-align: center;
          font-weight: 700;
        }
        .small-text {
          font-size: 9px;
        }
        .criteria-table td {
          font-size: 9px;
        }
        .criteria-grade {
          background: #f8f4e8;
        }

        /* ── Footer ── */
        .footer-grid {
          border: 1px solid #c5d5c5;
          border-top: 2px solid #d4af37;
          padding: 8px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          border-radius: 0 0 2px 2px;
        }
        .footer-field {
          margin-bottom: 4px;
        }
        .footer-label {
          font-size: 9px;
          color: #555;
        }
        .footer-val {
          font-weight: 700;
          color: #1E5631;
          font-size: 11px;
          border-bottom: 1px dotted #c5d5c5;
          padding-left: 4px;
          display: inline;
        }
        .sign-text {
          height: 22px;
          display: flex;
          align-items: center;
          font-family: 'Amiri', serif;
          font-size: 13px;
          color: #1E5631;
          font-style: italic;
        }
        .reco-text {
          font-family: 'Amiri', serif;
          font-size: 12px;
          color: #1E5631;
          font-style: italic;
          min-height: 22px;
          margin-top: 2px;
        }

        /* ── Watermark ── */
        .watermark {
          text-align: center;
          margin-top: 8px;
          font-family: 'Amiri', serif;
          font-size: 11px;
          color: #c5d5c5;
          font-style: italic;
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <div class="outer-border">
        
        <!-- Header -->
        <div class="header-container">
          <img src="${SCHOOL_LOGO_BASE64}" class="header-logo" alt="School Logo" />
          <div class="header-text">
            <h1>أكاديمية دار صغار الحفاظ</h1>
            <h2>Home of Young Huffaz Academy</h2>
            <p class="sub">Early Years · Elementary · Islamic/Tahfeezh (Dual Curriculum)</p>
            <p class="contact">Address complex, Takushara, Abuja, Nigeria | Tel: +2348037322312, +2349033245467 | Email: info@younghuffaz.com</p>
          </div>
          <img src="${SCHOOL_LOGO_BASE64}" class="header-logo" alt="School Logo" />
        </div>

        <!-- Student Info Table -->
        <table class="info-table">
          <tr>
            <td>
              <div class="bilingual-cell">
                <span class="en">Level: <span class="val-text">${escapeHtml(student.level)}</span></span>
                <span class="ar">المستوى</span>
              </div>
            </td>
            <td>
              <div class="bilingual-cell">
                <span class="en">Student's Name: <span class="val-text">${escapeHtml(student.name)}</span></span>
                <span class="ar">اسم الطالب</span>
              </div>
            </td>
            <td>
              <div class="bilingual-cell">
                <span class="en">Student Number: <span class="val-text">${escapeHtml(student.admissionNumber)}</span></span>
                <span class="ar">رقم الطالب</span>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div class="bilingual-cell">
                <span class="en">Section: <span class="val-text">${escapeHtml(student.section)}</span></span>
                <span class="ar">القسم</span>
              </div>
            </td>
            <td>
              <div class="bilingual-cell">
                <span class="en">Academic Year: <span class="val-text">${escapeHtml(result.academicYear)}</span></span>
                <span class="ar">العام الدراسي</span>
              </div>
            </td>
            <td>
              <div class="bilingual-cell">
                <span class="en">General Grade: <span class="val-text" style="font-size: 14px;">${escapeHtml(result.generalGrade)}</span></span>
                <span class="ar">التقدير العام</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Term Exam Result Heading -->
        <div class="section-heading">
          <span>${escapeHtml(result.term)} Examination Result</span>
          <span class="ar" style="font-family: 'Cairo', sans-serif;">كشف درجات الامتحان والتقييم</span>
        </div>

        <div class="sub-heading">Tahfeezh Section (Islamic Studies) / قسم التحفيظ</div>
        <table class="results-table">
          <thead>
            <tr>
              <th style="width: 45%;">
                <div class="bilingual-cell">
                  <span class="en">Subjects</span>
                  <span class="ar">المواد</span>
                </div>
              </th>
              <th style="width: 10%;">Grade</th>
              <th style="width: 11%;">100%</th>
              <th style="width: 11%;">60% (Exam)</th>
              <th style="width: 20% (CA1)">20% (CA1)</th>
              <th style="width: 12%;">20% (CA2)</th>
            </tr>
          </thead>
          <tbody>
            ${tahfeezhRows}
          </tbody>
        </table>

        <div class="sub-heading">Academic Subjects / المواد الأكاديمية</div>
        <table class="results-table">
          <thead>
            <tr>
              <th style="width: 45%;">
                <div class="bilingual-cell">
                  <span class="en">Subjects</span>
                  <span class="ar">المواد</span>
                </div>
              </th>
              <th style="width: 10%;">Grade</th>
              <th style="width: 11%;">100%</th>
              <th style="width: 11%;">60% (Exam)</th>
              <th style="width: 20% (CA1)">20% (CA1)</th>
              <th style="width: 12%;">20% (CA2)</th>
            </tr>
          </thead>
          <tbody>
            ${academicRows}
          </tbody>
        </table>

        <!-- Tahfeezh Details Block -->
        <div class="tahfeezh-section">
          <div class="tahfeezh-col">
            <div class="tahfeezh-title bilingual-cell">
              <span class="en">Total Absence of Hifz</span>
              <span class="ar">عدد مرات عدم التسميع</span>
            </div>
            <div class="tahfeezh-val">${escapeHtml(result.tahfeezhDetails.absenceOfHifz || '0')}</div>
          </div>
          <div class="tahfeezh-col">
            <div class="tahfeezh-title bilingual-cell">
              <span class="en">Attendance (Absent)</span>
              <span class="ar">الغياب</span>
            </div>
            <div class="tahfeezh-val" style="font-size: 10px;">
              Present: <b>${escapeHtml(result.tahfeezhDetails.daysPresent || '—')}</b><br>
              Absent: <b>${escapeHtml(result.tahfeezhDetails.daysAbsent || '0')}</b>
            </div>
          </div>
          <div class="tahfeezh-col">
            <div class="tahfeezh-title bilingual-cell">
              <span class="en">Memorization (From → To Surah)</span>
              <span class="ar">من سورة إلى سورة</span>
            </div>
            <div class="tahfeezh-val" style="font-size: 11px; display: flex; justify-content: space-around;">
              <span>From: <b>${escapeHtml(result.tahfeezhDetails.fromSurah || '—')}</b></span>
              <span>To: <b>${escapeHtml(result.tahfeezhDetails.toSurah || '—')}</b></span>
            </div>
          </div>
          <div class="tahfeezh-col">
            <div class="tahfeezh-title bilingual-cell">
              <span class="en">Memorized Pages</span>
              <span class="ar">أوجه الحفظ</span>
            </div>
            <div class="tahfeezh-val">${escapeHtml(result.tahfeezhDetails.memorizedPages || '—')}</div>
          </div>
        </div>

        <!-- Totals Block -->
        <div class="totals-section">
          <div class="total-box">
            <div class="total-title bilingual-cell">
              <span class="en">Supervisor's Recommendations</span>
              <span class="ar">توصيات المشرف التربوي</span>
            </div>
            <div class="recommendation-text">${escapeHtml(result.supervisorRecommendations || 'Masha Allah Barakallahu Feeh')}</div>
          </div>
          <div class="total-box">
            <div class="total-title bilingual-cell">
              <span class="en">Final Average</span>
              <span class="ar">المعدل النهائي</span>
            </div>
            <div class="total-val">${escapeHtml(result.finalAverage)}</div>
          </div>
          <div class="total-box">
            <div class="total-title bilingual-cell">
              <span class="en">Total Mark</span>
              <span class="ar">الدرجة الإجمالية</span>
            </div>
            <div class="total-val">${escapeHtml(result.totalMark)}</div>
          </div>
        </div>

        <!-- Evaluations and Criteria Section -->
        <div class="eval-criteria-container">
          <div>
            <table class="eval-table">
              <thead>
                <tr>
                  <th style="width: 70%;">
                    <div class="bilingual-cell">
                      <span class="en">Elements of Evaluation</span>
                      <span class="ar">عناصر التقويم</span>
                    </div>
                  </th>
                  <th style="width: 30%;">
                    <div class="bilingual-cell">
                      <span class="en">Rating</span>
                      <span class="ar">التقييم</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                ${evaluationRows}
              </tbody>
            </table>
          </div>

          <div>
            <table class="criteria-table">
              <thead>
                <tr>
                  <th style="width: 60%;">
                    <div class="bilingual-cell">
                      <span class="en">Evaluation Criteria</span>
                      <span class="ar">معايير التقييم</span>
                    </div>
                  </th>
                  <th style="width: 40%;">
                    <div class="bilingual-cell">
                      <span class="en">Level/Rating</span>
                      <span class="ar">مستوى التقييم</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr class="criteria-grade">
                  <td class="small-text font-bold">Excellent (A) 100–80</td>
                  <td class="small-text center bilingual-cell"><span class="en">5-Excellent</span><span class="ar">ممتاز</span></td>
                </tr>
                <tr>
                  <td class="small-text font-bold">V. Good (B) 79–70</td>
                  <td class="small-text center bilingual-cell"><span class="en">4-V. Good</span><span class="ar">جيد جدا</span></td>
                </tr>
                <tr class="criteria-grade">
                  <td class="small-text font-bold">Good (C) 69–60</td>
                  <td class="small-text center bilingual-cell"><span class="en">3-Good</span><span class="ar">جيد</span></td>
                </tr>
                <tr>
                  <td class="small-text font-bold">Pass (D) 59–50</td>
                  <td class="small-text center bilingual-cell"><span class="en">2-Fair</span><span class="ar">مقبول</span></td>
                </tr>
                <tr class="criteria-grade">
                  <td class="small-text font-bold">Fail (F) 49–0</td>
                  <td class="small-text center bilingual-cell"><span class="en">1-Poor</span><span class="ar">ضعيف</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer Grid -->
        <div class="footer-grid">
          <div>
            <div class="footer-field">
              <span class="footer-label">Teacher's Name:</span> <span class="footer-val">${escapeHtml(result.teacherName)}</span>
            </div>
            <div class="footer-field" style="margin-top: 5px;">
              <span class="footer-label">Teacher's Recommendations:</span>
              <div class="reco-text">
                ${escapeHtml(result.teacherRecommendations || 'A good and disciplined student. Keep it up.')}
              </div>
            </div>
            <div class="footer-field" style="margin-top: 6px;">
              <span class="footer-label">Next Term Begins:</span> <span class="footer-val">${escapeHtml(result.nextTermBegins)}</span>
            </div>
          </div>
          
          <div>
            <div class="footer-field">
              <span class="footer-label">Date Issued:</span> <span class="footer-val">${escapeHtml(result.dateIssued)}</span>
            </div>
            <div class="footer-field" style="margin-top: 5px;">
              <span class="footer-label">Exam Officer's Sign:</span>
              <div class="sign-text">Approved Online</div>
            </div>
            <div class="footer-field" style="margin-top: 5px;">
              <span class="footer-label">Head Teacher's Comments & Sign:</span>
              <div class="reco-text">
                ${escapeHtml(result.headTeacherComments || 'An Outstanding Performance. Keep it up.')}
              </div>
            </div>
          </div>
        </div>

        <div class="watermark">An Outstanding Performance, Keep it up</div>

      </div>
    </body>
    </html>
  `;
};

// Generate and send PDF response
export const generateResultPdf = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await Result.findById(id);
    if (!result) {
      return res.status(404).json({ message: 'Result sheet not found' });
    }

    const student = await Student.findOne({ _id: result.studentId, isDeleted: { $ne: true } });
    if (!student) {
      return res.status(404).json({ message: 'Student details not found' });
    }

    // Security check: if parent, ensure they only download their child's result and it is approved
    if (req.user?.role === 'PARENT') {
      if (student.admissionNumber !== req.user.admissionNumber) {
        return res.status(403).json({ message: 'Unauthorized access to this PDF' });
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
        (cls) => cls.level === student.level && cls.section === student.section
      );
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this student\'s class.' });
      }
    }

    const htmlContent = generateReportHtml(result, student);

    // Launch puppeteer
    let browser;
    if (process.env.VERCEL) {
      // In Vercel, use @sparticuz/chromium with puppeteer-core
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: (chromium as any).defaultViewport,
        executablePath: await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar'),
        headless: true,
      });
    } else {
      // Locally, use the standard puppeteer
      const localPuppeteer = require('puppeteer');
      browser = await localPuppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate A4 PDF buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '8mm',
        bottom: '8mm',
        left: '8mm',
        right: '8mm'
      }
    });

    await browser.close();

    // Set response headers and send binary data
    const filename = `Report_${student.admissionNumber.replace(/\//g, '_')}_${result.term.replace(/ /g, '_')}.pdf`;
    const finalBuffer = Buffer.from(pdfBuffer);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', finalBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.end(finalBuffer);

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return res.status(500).json({ message: 'Server error generating PDF', error: error.message });
  }
};
