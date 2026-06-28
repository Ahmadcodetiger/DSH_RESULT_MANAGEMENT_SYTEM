import { Response } from 'express';
import puppeteer from 'puppeteer-core';
// @ts-ignore
import chromium from '@sparticuz/chromium';
import { AuthRequest } from '../middleware/auth';
import Result from '../models/Result';
import Student from '../models/Student';
import User from '../models/User';
import Invoice from '../models/Invoice';
import Settings from '../models/Settings';
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

// Helper to generate the HTML string
const generateReportHtml = (result: any, student: any, settings: any) => {
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
          <td class="center">${escapeHtml(sub.score20_1)}</td>
          <td class="center">${escapeHtml(sub.score20_2)}</td>
          <td class="center">${escapeHtml(sub.score60)}</td>
          <td class="center font-bold">${escapeHtml(sub.score100)}</td>
          <td class="center font-bold grade-cell">${escapeHtml(sub.grade || 'F')}</td>
        </tr>
      `;
    }).join('');
  };

  const calculateSectionMetrics = (subjects: any[]) => {
    const sectionSubjects = subjects.filter(s => s.isGraded);
    if (sectionSubjects.length === 0) {
      return { total: '—', grade: '—' };
    }
    
    let total = 0;
    sectionSubjects.forEach(s => {
      total += s.score100 || 0;
    });
    
    const average = Math.round(total / sectionSubjects.length);
    
    let grade = 'F';
    if (average >= 80) grade = 'A';
    else if (average >= 70) grade = 'B';
    else if (average >= 60) grade = 'C';
    else if (average >= 50) grade = 'D';
    
    return { total, grade };
  };

  const tahfeezhSubjects = result.subjects.filter((s: any) => s.section === 'tahfeezh');
  const islamicSubjects = result.subjects.filter((s: any) => s.section === 'islamic');
  const academicSubjects = result.subjects.filter((s: any) => s.section === 'academic');

  const tahfeezhMetrics = calculateSectionMetrics(tahfeezhSubjects);
  const islamicMetrics = calculateSectionMetrics(islamicSubjects);
  const academicMetrics = calculateSectionMetrics(academicSubjects);

  const tahfeezhRows = renderSubjectRows(tahfeezhSubjects);
  const islamicRows = renderSubjectRows(islamicSubjects);
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
        @page {
          size: A4;
          margin: 6mm;
        }
        body {
          font-family: 'Inter', 'Cairo', sans-serif;
          color: #1a1a1a;
          background: #ffffff;
          padding: 0;
          margin: 0;
          width: 100%;
          height: 100%;
          font-size: 10px;
          line-height: 1.2;
          -webkit-print-color-adjust: exact;
        }
        .outer-border {
          border: 3px solid #1E5631;
          padding: 10px;
          width: 100%;
          height: calc(297mm - 12mm);
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }
        
        /* ── Header ── */
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2.5px solid #1E5631;
          padding-bottom: 6px;
          margin-bottom: 6px;
        }
        .header-logo {
          width: 70px;
          height: 70px;
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
          font-size: 18px;
          color: #1E5631;
          margin-bottom: 1px;
          font-weight: 700;
        }
        .header-text h2 {
          font-size: 12.5px;
          color: #1a1a1a;
          margin-bottom: 1px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .header-text p.sub {
          font-size: 7.5px;
          font-weight: 600;
          color: #555;
          text-transform: uppercase;
          margin-bottom: 1px;
          letter-spacing: 0.2px;
        }
        .header-text p.contact {
          font-size: 7px;
          color: #888;
        }

        /* ── Student info table ── */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0px;
        }
        .info-table td {
          border: 1px solid #b8c9b8;
          padding: 4px 6px;
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
          font-size: 8.5px;
        }
        .ar {
          font-family: 'Cairo', sans-serif;
          text-align: right;
          direction: rtl;
          font-size: 8.5px;
          color: #555;
        }
        .val-text {
          font-weight: 700;
          color: #1E5631;
          margin-left: 4px;
          font-size: 10px;
        }
        .muted {
          color: #bbb;
          font-size: 8.5px;
        }

        /* ── Section headers ── */
        .section-heading {
          background: #1E5631;
          color: #fff;
          padding: 3px 6px;
          font-weight: 700;
          font-size: 9px;
          margin-bottom: 3px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .section-heading .ar {
          color: rgba(255,255,255,0.85);
        }
        .sub-heading {
          color: #1E5631;
          font-size: 9px;
          font-weight: 700;
          margin-bottom: 2px;
          margin-top: 4px;
          padding-bottom: 1px;
          border-bottom: 1px solid #d4af37;
          display: inline-block;
        }

        /* ── Results table ── */
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
        }
        .results-table th, .results-table td {
          border: 1px solid #c5d5c5;
          padding: 2.2px 4px;
        }
        .results-table th {
          background: #eef4ee;
          color: #1E5631;
          font-size: 11px;
          text-align: center;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }
        .results-table td {
          font-size: 11.5px;
        }
        .results-table td.center {
          text-align: center;
        }
        .font-bold {
          font-weight: 700;
        }
        .grade-cell {
          color: #1E5631;
          font-size: 13px;
        }

        /* ── Tahfeezh Progress block ── */
        .tahfeezh-section {
          display: grid;
          grid-template-columns: 1fr 1fr 2fr 1fr;
          gap: 0;
          border: 1px solid #c5d5c5;
          margin-bottom: 5px;
          border-radius: 2px;
          overflow: hidden;
        }
        .tahfeezh-col {
          border-right: 1px solid #c5d5c5;
          padding: 3.5px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .tahfeezh-col:last-child {
          border-right: none;
        }
        .tahfeezh-title {
          font-size: 9px;
          color: #1E5631;
          font-weight: 700;
          text-align: center;
          border-bottom: 1px solid #e8ede8;
          padding-bottom: 2px;
          margin-bottom: 3px;
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
          margin-bottom: 5px;
          border-radius: 2px;
          overflow: hidden;
        }
        .total-box {
          border-right: 1px solid #c5d5c5;
          padding: 3.5px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .total-box:last-child {
          border-right: none;
        }
        .total-title {
          font-size: 9px;
          color: #1E5631;
          font-weight: 700;
          text-align: center;
          border-bottom: 1px solid #e8ede8;
          padding-bottom: 2px;
          margin-bottom: 3px;
        }
        .total-val {
          text-align: center;
          font-size: 15px;
          font-weight: 700;
          color: #1E5631;
        }
        .recommendation-text {
          font-family: 'Amiri', serif;
          font-size: 12px;
          color: #1E5631;
          text-align: center;
          margin-top: 2px;
          font-style: italic;
        }

        /* ── Evaluations and Criteria ── */
        .eval-criteria-container {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 6px;
          margin-bottom: 5px;
        }
        .eval-table, .criteria-table {
          width: 100%;
          border-collapse: collapse;
        }
        .eval-table th, .eval-table td, .criteria-table th, .criteria-table td {
          border: 1px solid #c5d5c5;
          padding: 2.2px 4px;
        }
        .eval-table th, .criteria-table th {
          background: #eef4ee;
          color: #1E5631;
          font-size: 9.5px;
          text-align: center;
          font-weight: 700;
        }
        .small-text {
          font-size: 9.5px;
        }
        .criteria-table td {
          font-size: 9.5px;
        }
        .criteria-grade {
          background: #f8f4e8;
        }

        /* ── Footer ── */
        .footer-grid {
          border: 1px solid #c5d5c5;
          border-top: 2px solid #d4af37;
          padding: 5px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          border-radius: 0 0 2px 2px;
        }
        .footer-field {
          margin-bottom: 3px;
        }
        .footer-label {
          font-size: 9.5px;
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
          height: 18px;
          display: flex;
          align-items: center;
          font-family: 'Amiri', serif;
          font-size: 12px;
          color: #1E5631;
          font-style: italic;
        }
        .reco-text {
          font-family: 'Amiri', serif;
          font-size: 11.5px;
          color: #1E5631;
          font-style: italic;
          min-height: 18px;
          margin-top: 2px;
        }

        /* ── Watermark ── */
        .watermark {
          text-align: center;
          margin-top: 5px;
          font-family: 'Amiri', serif;
          font-size: 10.5px;
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
          ${student.picture ? `
            <img src="${escapeHtml(student.picture)}" class="header-logo" style="width: 60px; height: 75px; object-fit: cover; border: 1.5px solid #1E5631;" alt="Student Passport" />
          ` : `
            <div style="width: 60px; height: 75px; border: 1.5px solid #1E5631; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #fafafa; color: #888; font-size: 6px; text-align: center; padding: 2px; flex-shrink: 0;" class="header-logo">
              <span style="font-weight: bold; line-height: 1.1; font-size: 7px;">PASSPORT<br>PHOTO</span>
            </div>
          `}
          <div class="header-text">
            <h1>${escapeHtml(settings.schoolNameArabic || 'أكاديمية دار صغار الحفاظ')}</h1>
            <h2>${escapeHtml(settings.schoolName)}</h2>
            <p class="sub">${escapeHtml(settings.schoolSubHeader || 'Early Years · Elementary · Islamic/Tahfeezh (Dual Curriculum)')}</p>
            <p class="contact">${escapeHtml(settings.address)} | Tel: ${escapeHtml(settings.phoneNumbers)} | Email: ${escapeHtml(settings.email)}</p>
          </div>
          <img src="${SCHOOL_LOGO_BASE64}" class="header-logo" alt="School Logo" />
        </div>

        <!-- Student Info Table -->
        <table class="info-table" style="margin-bottom: 6px;">
          <tr>
            <td>
              <div class="bilingual-cell">
                <span class="en">Class: <span class="val-text">${escapeHtml(student.level)}</span></span>
                <span class="ar">الصف</span>
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
            <td colspan="2">
              <div class="bilingual-cell">
                <span class="en">Academic Year: <span class="val-text">${escapeHtml(result.academicYear)}</span></span>
                <span class="ar">العام الدراسي</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Term Exam Result Heading -->
        <div class="section-heading">
          <span>${escapeHtml(result.term)} Examination Result</span>
          <span class="ar" style="font-family: 'Cairo', sans-serif;">كشف درجات الامتحان والتقييم</span>
        </div>

        <div class="sub-heading">Tahfeezh Section (Qur'an & Hifz) / قسم التحفيظ</div>
        <table class="results-table">
          <thead>
            <tr>
              <th style="width: 45%;">
                <div class="bilingual-cell">
                  <span class="en">Subjects</span>
                  <span class="ar">المواد</span>
                </div>
              </th>
              <th style="width: 11%;">20% (CA1)</th>
              <th style="width: 11%;">20% (CA2)</th>
              <th style="width: 11%;">60% (Exam)</th>
              <th style="width: 11%;">100% (Total)</th>
              <th style="width: 11%;">Grade</th>
            </tr>
          </thead>
          <tbody>
            ${tahfeezhRows}
            <tr style="background-color: #f4faf4; font-weight: bold; border-top: 1.5px solid #1E5631;">
              <td colspan="4" style="text-align: left; padding: 3px 5px;">
                <div class="bilingual-cell">
                  <span class="en" style="font-size: 8px;">Section Total Marks & Grade</span>
                  <span class="ar" style="font-size: 8px;">إجمالي درجات القسم والتقدير للمواد</span>
                </div>
              </td>
              <td class="center" style="color: #1E5631; font-size: 9px; font-weight: 700;">${tahfeezhMetrics.total}</td>
              <td class="center grade-cell" style="color: #1E5631; font-size: 10px; font-weight: 700;">${tahfeezhMetrics.grade}</td>
            </tr>
          </tbody>
        </table>

        <!-- Tahfeezh Details Block -->
        <div class="tahfeezh-section">
          <div class="tahfeezh-col">
            <div class="tahfeezh-title bilingual-cell">
              <span class="en">Total Hifz Days</span>
              <span class="ar">إجمالي أيام الحفظ</span>
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

        <div class="sub-heading">Islamic Studies / الدراسات الإسلامية</div>
        <table class="results-table">
          <thead>
            <tr>
              <th style="width: 45%;">
                <div class="bilingual-cell">
                  <span class="en">Subjects</span>
                  <span class="ar">المواد</span>
                </div>
              </th>
              <th style="width: 11%;">20% (CA1)</th>
              <th style="width: 11%;">20% (CA2)</th>
              <th style="width: 11%;">60% (Exam)</th>
              <th style="width: 11%;">100% (Total)</th>
              <th style="width: 11%;">Grade</th>
            </tr>
          </thead>
          <tbody>
            ${islamicRows}
            <tr style="background-color: #f4faf4; font-weight: bold; border-top: 1.5px solid #1E5631;">
              <td colspan="4" style="text-align: left; padding: 3px 5px;">
                <div class="bilingual-cell">
                  <span class="en" style="font-size: 8px;">Section Total Marks & Grade</span>
                  <span class="ar" style="font-size: 8px;">إجمالي درجات القسم والتقدير للمواد</span>
                </div>
              </td>
              <td class="center" style="color: #1E5631; font-size: 9px; font-weight: 700;">${islamicMetrics.total}</td>
              <td class="center grade-cell" style="color: #1E5631; font-size: 10px; font-weight: 700;">${islamicMetrics.grade}</td>
            </tr>
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
              <th style="width: 11%;">20% (CA1)</th>
              <th style="width: 11%;">20% (CA2)</th>
              <th style="width: 11%;">60% (Exam)</th>
              <th style="width: 11%;">100% (Total)</th>
              <th style="width: 11%;">Grade</th>
            </tr>
          </thead>
          <tbody>
            ${academicRows}
            <tr style="background-color: #f4faf4; font-weight: bold; border-top: 1.5px solid #1E5631;">
              <td colspan="4" style="text-align: left; padding: 3px 5px;">
                <div class="bilingual-cell">
                  <span class="en" style="font-size: 8px;">Section Total Marks & Grade</span>
                  <span class="ar" style="font-size: 8px;">إجمالي درجات القسم والتقدير للمواد</span>
                </div>
              </td>
              <td class="center" style="color: #1E5631; font-size: 9px; font-weight: 700;">${academicMetrics.total}</td>
              <td class="center grade-cell" style="color: #1E5631; font-size: 10px; font-weight: 700;">${academicMetrics.grade}</td>
            </tr>
          </tbody>
        </table>

        <!-- Totals Block -->
        <div class="totals-section" style="grid-template-columns: 1fr 1fr; margin-bottom: 5px;">
          <div class="total-box">
            <div class="total-title bilingual-cell">
              <span class="en">Total Mark</span>
              <span class="ar">الدرجة الإجمالية</span>
            </div>
            <div class="total-val">${escapeHtml(result.totalMark)}</div>
          </div>
          <div class="total-box">
            <div class="total-title bilingual-cell">
              <span class="en">Final Average</span>
              <span class="ar">المعدل النهائي</span>
            </div>
            <div class="total-val">${escapeHtml(result.finalAverage)}</div>
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

        <!-- Supervisor's Recommendations (Standalone Block at the Bottom) -->
        <div class="recommendations-section" style="border: 1px solid #c5d5c5; border-radius: 2px; margin-bottom: 5px; background: #fafcfa; padding: 4px;">
          <div class="bilingual-cell" style="font-weight: 700; color: #1E5631; font-size: 8px; border-bottom: 1px solid #e8ede8; padding-bottom: 2px; margin-bottom: 3px;">
            <span class="en">Supervisor's Recommendations</span>
            <span class="ar">توصيات المشرف التربوي</span>
          </div>
          <div class="recommendation-text" style="font-family: 'Amiri', serif; font-size: 11.5px; color: #1E5631; text-align: center; font-style: italic; min-height: 18px; line-height: 1.3; margin-top: 2px;">
            ${escapeHtml(result.supervisorRecommendations || 'Masha Allah Barakallahu Feeh')}
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
            <div class="footer-field" style="margin-top: 6px; display: flex; justify-content: space-between; gap: 15px;">
              <div>
                <span class="footer-label">Next Term Begins:</span> <span class="footer-val">${escapeHtml(result.nextTermBegins || '—')}</span>
              </div>
              <div style="margin-right: 15px;">
                <span class="footer-label">Next Term Fees:</span> <span class="footer-val">${escapeHtml(result.nextTermSchoolFees || '—')}</span>
              </div>
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

    const settings = await getSchoolSettings();
    const htmlContent = generateReportHtml(result, student, settings);

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
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm'
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

// --- INVOICE & RECEIPT HTML GENERATORS ---

const generateInvoiceHtml = (invoice: any, student: any, settings: any) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice - ${escapeHtml(invoice.title)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; padding: 20px; color: #333; }
        .invoice-card { border: 2.5px solid #1E5631; padding: 30px; border-radius: 8px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1E5631; padding-bottom: 15px; margin-bottom: 20px; }
        .header img { width: 80px; }
        .header h1 { font-family: 'Cairo', sans-serif; font-size: 24px; color: #1E5631; margin: 0; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .details-block h3 { color: #1E5631; border-bottom: 1.5px solid #c5d5c5; padding-bottom: 5px; margin-bottom: 10px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .table th, .table td { border: 1px solid #c5d5c5; padding: 12px; text-align: left; }
        .table th { background: #eef4ee; color: #1E5631; }
        .total-row { font-weight: bold; font-size: 16px; background: #fafcfa; }
        .footer-note { text-align: center; margin-top: 50px; font-size: 12px; color: #666; border-top: 1px dotted #c5d5c5; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <div class="header">
          <img src="${SCHOOL_LOGO_BASE64}" alt="Logo" />
          <div style="text-align: center;">
            <h1 style="font-size: 20px;">أكاديمية دار صغار الحفاظ</h1>
            <h2 style="font-size: 18px; margin: 5px 0;">${escapeHtml(settings.schoolName)}</h2>
            <p style="font-size: 10px; color: #666;">${escapeHtml(settings.address)} | Financial Office Billing Statement</p>
          </div>
          <img src="${SCHOOL_LOGO_BASE64}" alt="Logo" />
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1E5631; text-transform: uppercase; letter-spacing: 1px;">Academy Fee Invoice</h2>
          <p>Invoice ID: <b>${invoice._id}</b></p>
        </div>

        <div class="details-grid">
          <div class="details-block">
            <h3>Billed To (Student Details)</h3>
            <p><b>Name:</b> ${escapeHtml(student.name)}</p>
            <p><b>Admission Number:</b> ${escapeHtml(student.admissionNumber)}</p>
            <p><b>Class:</b> ${escapeHtml(student.level)} - ${escapeHtml(student.section)}</p>
          </div>
          <div class="details-block">
            <h3>Invoice Overview</h3>
            <p><b>Billing Date:</b> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
            <p><b>Payment Due Date:</b> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            <p><b>Payment Status:</b> <span style="text-transform: uppercase; font-weight: bold; color: ${invoice.status === 'paid' ? '#1E5631' : invoice.status === 'partially_paid' ? '#d4af37' : '#d9534f'}">${invoice.status}</span></p>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Fee Description</th>
              <th style="text-align: right; width: 150px;">Billed Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(invoice.title)}</td>
              <td style="text-align: right; font-weight: 500;">₦${invoice.amount.toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td style="text-align: right;">Total Amount Due:</td>
              <td style="text-align: right; color: #1E5631;">₦${invoice.amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="text-align: right; font-weight: 500;">Total Paid So Far:</td>
              <td style="text-align: right; color: #5bc0de; font-weight: 500;">₦${invoice.paidAmount.toLocaleString()}</td>
            </tr>
            <tr class="total-row" style="background: #fff9eb;">
              <td style="text-align: right;">Outstanding Balance Due:</td>
              <td style="text-align: right; color: #d9534f;">₦${(invoice.amount - invoice.paidAmount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div style="background: #fafcfa; border: 1px dashed #1E5631; padding: 15px; border-radius: 4px; font-size: 12px; line-height: 1.6;">
          <h4 style="color: #1E5631; margin-bottom: 5px;">Bank Transfer Settlement Instructions</h4>
          <p>Payments can be made directly via bank transfer to the school's bank account:</p>
          <p><b>Bank Name:</b> ${escapeHtml(settings.bankName)}</p>
          <p><b>Account Name:</b> ${escapeHtml(settings.accountName)}</p>
          <p><b>Account Number:</b> ${escapeHtml(settings.accountNumber)}</p>
          <p>Please present the transfer receipt/reference code to the Accountant Accounts Office for confirmation.</p>
        </div>

        <div class="footer-note">
          <p>Thank you for choosing ${escapeHtml(settings.schoolName)}.</p>
          <p>This is a computer-generated billing statement issued by the Finance & Accounting Registry.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateReceiptHtml = (invoice: any, student: any, payment: any, settings: any) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Receipt - Payment Confirmation</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; padding: 20px; color: #333; }
        .receipt-card { border: 2.5px solid #1E5631; padding: 30px; border-radius: 8px; position: relative; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1E5631; padding-bottom: 15px; margin-bottom: 20px; }
        .header img { width: 80px; }
        .header h1 { font-family: 'Cairo', sans-serif; font-size: 24px; color: #1E5631; margin: 0; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .details-block h3 { color: #1E5631; border-bottom: 1.5px solid #c5d5c5; padding-bottom: 5px; margin-bottom: 10px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .table th, .table td { border: 1px solid #c5d5c5; padding: 12px; text-align: left; }
        .table th { background: #eef4ee; color: #1E5631; }
        .total-row { font-weight: bold; font-size: 16px; background: #fafcfa; }
        .footer-note { text-align: center; margin-top: 50px; font-size: 12px; color: #666; border-top: 1px dotted #c5d5c5; padding-top: 15px; }
        .paid-stamp { position: absolute; top: 120px; right: 50px; border: 3px solid #1E5631; color: #1E5631; text-transform: uppercase; font-size: 20px; font-weight: bold; padding: 10px 20px; border-radius: 4px; transform: rotate(-10deg); opacity: 0.8; }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="paid-stamp">Receipt Paid</div>
        
        <div class="header">
          <img src="${SCHOOL_LOGO_BASE64}" alt="Logo" />
          <div style="text-align: center;">
            <h1 style="font-size: 20px;">أكاديمية دار صغار الحفاظ</h1>
            <h2 style="font-size: 18px; margin: 5px 0;">${escapeHtml(settings.schoolName)}</h2>
            <p style="font-size: 10px; color: #666;">${escapeHtml(settings.address)} | Financial Office Receipt Registry</p>
          </div>
          <img src="${SCHOOL_LOGO_BASE64}" alt="Logo" />
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1E5631; text-transform: uppercase; letter-spacing: 1px;">Payment Receipt</h2>
          <p>Receipt ID: <b>${payment._id}</b></p>
        </div>

        <div class="details-grid">
          <div class="details-block">
            <h3>Student Details</h3>
            <p><b>Name:</b> ${escapeHtml(student.name)}</p>
            <p><b>Admission Number:</b> ${escapeHtml(student.admissionNumber)}</p>
            <p><b>Class:</b> ${escapeHtml(student.level)} - ${escapeHtml(student.section)}</p>
          </div>
          <div class="details-block">
            <h3>Transaction Details</h3>
            <p><b>Payment Date:</b> ${new Date(payment.date).toLocaleString()}</p>
            <p><b>Payment Method:</b> <span style="text-transform: uppercase; font-weight: bold;">${escapeHtml(payment.method.replace('_', ' '))}</span></p>
            <p><b>Transaction Ref:</b> <code>${escapeHtml(payment.transactionRef || 'N/A')}</code></p>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Invoice Description</th>
              <th style="text-align: right; width: 150px;">Billed Amt</th>
              <th style="text-align: right; width: 150px;">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(invoice.title)}</td>
              <td style="text-align: right;">₦${invoice.amount.toLocaleString()}</td>
              <td style="text-align: right; font-weight: bold; color: #1E5631;">₦${payment.amount.toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" style="text-align: right;">Total Amount Confirmed Paid:</td>
              <td style="text-align: right; color: #1E5631;">₦${payment.amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td colspan="2" style="text-align: right; font-weight: 500;">Invoice Cumulative Paid:</td>
              <td style="text-align: right; color: #5bc0de; font-weight: 500;">₦${invoice.paidAmount.toLocaleString()}</td>
            </tr>
            <tr class="total-row" style="background: #fff9eb;">
              <td colspan="2" style="text-align: right;">Remaining Outstanding Balance:</td>
              <td style="text-align: right; color: #d9534f;">₦${(invoice.amount - invoice.paidAmount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer-note">
          <p>Thank you for your prompt fee settlement.</p>
          <p>This payment has been successfully recorded and processed by the Academy Accounts Department.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// --- CONTROLLER HANDLERS FOR INVOICES & RECEIPTS ---

export const generateInvoicePdf = async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user?.role === 'PARENT' && invoice.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to this invoice PDF' });
    }

    const student = await Student.findOne({ _id: invoice.studentId, isDeleted: { $ne: true } });
    if (!student) {
      return res.status(404).json({ message: 'Student details not found' });
    }

    const settings = await getSchoolSettings();
    const htmlContent = generateInvoiceHtml(invoice, student, settings);

    let browser;
    if (process.env.VERCEL) {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: (chromium as any).defaultViewport,
        executablePath: await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar'),
        headless: true,
      });
    } else {
      const localPuppeteer = require('puppeteer');
      browser = await localPuppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '15mm',
        right: '15mm'
      }
    });

    await browser.close();

    const filename = `Bill_${student.admissionNumber.replace(/\//g, '_')}_${invoice._id}.pdf`;
    const finalBuffer = Buffer.from(pdfBuffer);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', finalBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.end(finalBuffer);
  } catch (error: any) {
    console.error('Invoice PDF Generation Error:', error);
    return res.status(500).json({ message: 'Server error generating PDF', error: error.message });
  }
};

export const generateReceiptPdf = async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId, paymentId } = req.params;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user?.role === 'PARENT' && invoice.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to this receipt PDF' });
    }

    const student = await Student.findOne({ _id: invoice.studentId, isDeleted: { $ne: true } });
    if (!student) {
      return res.status(404).json({ message: 'Student details not found' });
    }

    const payment = invoice.payments.find(p => p._id.toString() === paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    const settings = await getSchoolSettings();
    const htmlContent = generateReceiptHtml(invoice, student, payment, settings);

    let browser;
    if (process.env.VERCEL) {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: (chromium as any).defaultViewport,
        executablePath: await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar'),
        headless: true,
      });
    } else {
      const localPuppeteer = require('puppeteer');
      browser = await localPuppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '15mm',
        right: '15mm'
      }
    });

    await browser.close();

    const filename = `Receipt_${student.admissionNumber.replace(/\//g, '_')}_${payment._id}.pdf`;
    const finalBuffer = Buffer.from(pdfBuffer);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', finalBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.end(finalBuffer);
  } catch (error: any) {
    console.error('Receipt PDF Generation Error:', error);
    return res.status(500).json({ message: 'Server error generating PDF', error: error.message });
  }
};
