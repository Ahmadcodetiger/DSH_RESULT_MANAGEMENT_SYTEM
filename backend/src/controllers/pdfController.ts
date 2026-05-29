import { Response } from 'express';
import puppeteer from 'puppeteer';
import { AuthRequest } from '../middleware/auth';
import Result from '../models/Result';
import Student from '../models/Student';

// Helper to generate the HTML string
const generateReportHtml = (result: any, student: any) => {
  const renderSubjectRows = (subjects: any[]) => {
    return subjects.map((sub: any) => {
      if (!sub.isGraded) {
        return `
          <tr>
            <td class="bilingual-cell">
              <span class="en">${sub.subjectName}</span>
              <span class="ar">${sub.subjectNameArabic}</span>
            </td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
          </tr>
        `;
      }

      return `
        <tr>
          <td class="bilingual-cell">
            <span class="en">${sub.subjectName}</span>
            <span class="ar">${sub.subjectNameArabic}</span>
          </td>
          <td class="center font-bold">${sub.grade || 'F'}</td>
          <td class="center">${sub.score100}</td>
          <td class="center">${sub.score60}</td>
          <td class="center">${sub.score20_1}</td>
          <td class="center">${sub.score20_2}</td>
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
          <span class="en">${el.elementLabel}</span>
          <span class="ar">${el.elementLabelArabic}</span>
        </td>
        <td class="center ar font-bold" style="font-size: 13px;">${el.rating || ''}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Report Sheet - ${student.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700&family=Alex+Brush&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Inter', 'Cairo', sans-serif;
          color: #1a1a1a;
          background: #ffffff;
          padding: 10px;
          font-size: 11px;
          line-height: 1.3;
        }
        .outer-border {
          border: 3px double #1E5631; /* School green border */
          padding: 15px;
          width: 100%;
          min-height: 275mm; /* Dynamic but structured A4 size */
          position: relative;
        }
        
        /* Header section styling */
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #1E5631;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .header-logo-placeholder {
          width: 70px;
          height: 70px;
          border: 2px dashed #1E5631;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1E5631;
          font-weight: bold;
          font-size: 9px;
          border-radius: 8px;
        }
        .header-text {
          text-align: center;
          flex-grow: 1;
        }
        .header-text h1 {
          font-family: 'Cairo', sans-serif;
          font-size: 19px;
          color: #1E5631;
          margin-bottom: 2px;
          font-weight: 700;
        }
        .header-text h2 {
          font-size: 15px;
          color: #1a1a1a;
          margin-bottom: 3px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .header-text p.sub {
          font-size: 8px;
          font-weight: 600;
          color: #4a4a4a;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .header-text p.contact {
          font-size: 7.5px;
          color: #777;
        }

        /* Student info table */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        .info-table td {
          border: 1px solid #1E5631;
          padding: 5px 8px;
          width: 33.33%;
          vertical-align: middle;
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
        }
        .ar {
          font-family: 'Cairo', sans-serif;
          text-align: right;
          direction: rtl;
        }
        .val-text {
          font-weight: bold;
          color: #1E5631;
          margin-left: 5px;
          font-size: 12px;
        }

        /* Results table */
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        .results-table th, .results-table td {
          border: 1px solid #1E5631;
          padding: 4px 6px;
        }
        .results-table th {
          background-color: #f1f8f3;
          color: #1E5631;
          font-size: 10px;
          font-weight: bold;
          text-align: center;
        }
        .results-table td.center {
          text-align: center;
        }
        .font-bold {
          font-weight: bold;
        }

        /* Tahfeezh Progress block */
        .tahfeezh-section {
          display: grid;
          grid-template-columns: 1fr 1fr 2fr 1fr;
          gap: 0;
          border: 1px solid #1E5631;
          margin-bottom: 12px;
        }
        .tahfeezh-col {
          border-right: 1px solid #1E5631;
          padding: 6px;
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
          font-weight: bold;
          text-align: center;
          border-bottom: 1px solid #eee;
          padding-bottom: 3px;
          margin-bottom: 4px;
        }
        .tahfeezh-val {
          text-align: center;
          font-size: 13px;
          font-weight: bold;
          color: #1E5631;
        }

        /* Totals Block */
        .totals-section {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          border: 1px solid #1E5631;
          margin-bottom: 12px;
        }
        .total-box {
          border-right: 1px solid #1E5631;
          padding: 6px;
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
          font-weight: bold;
          text-align: center;
          border-bottom: 1px solid #eee;
          padding-bottom: 3px;
          margin-bottom: 4px;
        }
        .total-val {
          text-align: center;
          font-size: 15px;
          font-weight: bold;
          color: #1E5631;
        }
        .cursive-recommendation {
          font-family: 'Alex Brush', cursive, sans-serif;
          font-size: 16px;
          color: #0b3d1b;
          text-align: center;
          margin-top: 4px;
        }

        /* Evaluations and Criteria layout */
        .eval-criteria-container {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        .eval-table, .criteria-table {
          width: 100%;
          border-collapse: collapse;
        }
        .eval-table th, .eval-table td, .criteria-table th, .criteria-table td {
          border: 1px solid #1E5631;
          padding: 4px 6px;
        }
        .eval-table th, .criteria-table th {
          background-color: #f1f8f3;
          color: #1E5631;
          font-size: 9px;
          text-align: center;
        }
        .small-text {
          font-size: 9px;
        }

        /* Footer block */
        .footer-grid {
          border: 1px solid #1E5631;
          padding: 8px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .footer-field {
          margin-bottom: 5px;
        }
        .footer-val {
          font-weight: bold;
          color: #1E5631;
          border-bottom: 1px dotted #1E5631;
          padding-left: 5px;
        }
        .sign-placeholder {
          height: 25px;
          display: flex;
          align-items: center;
          font-family: 'Alex Brush', cursive;
          font-size: 15px;
          color: #0b3d1b;
        }
      </style>
    </head>
    <body>
      <div class="outer-border">
        
        <!-- Header -->
        <div class="header-container">
          <div class="header-logo-placeholder">
            H.Y.H.A.
          </div>
          <div class="header-text">
            <h1>أكاديمية دار صغار الحفاظ</h1>
            <h2>HOME OF YOUNG HUFFAZ ACADEMY</h2>
            <p class="sub">EARLY YEARS, ELEMENTARY, ISLAMIC/TAHFEEZH (DUAL CURRICULUM)</p>
            <p class="contact">Address complex, Takushara, Abuja, Nigeria | Tel: +2348037322312, +2349033245467 | Email: info@younghuffaz.com</p>
          </div>
          <div class="header-logo-placeholder">
            LOGO
          </div>
        </div>

        <!-- Student Info Table -->
        <table class="info-table">
          <tr>
            <td>
              <div class="bilingual-cell">
                <span class="en">Level:<span class="val-text">${student.level}</span></span>
                <span class="ar">المستوى</span>
              </div>
            </td>
            <td>
              <div class="bilingual-cell">
                <span class="en">Student's Name:<span class="val-text">${student.name}</span></span>
                <span class="ar">اسم الطالب</span>
              </div>
            </td>
            <td>
              <div class="bilingual-cell">
                <span class="en">Student Number:<span class="val-text">${student.admissionNumber}</span></span>
                <span class="ar">رقم الطالب</span>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div class="bilingual-cell">
                <span class="en">Section:<span class="val-text">${student.section}</span></span>
                <span class="ar">القسم</span>
              </div>
            </td>
            <td>
              <div class="bilingual-cell">
                <span class="en">Academic Year:<span class="val-text">${result.academicYear}</span></span>
                <span class="ar">العام الدراسي</span>
              </div>
            </td>
            <td>
              <div class="bilingual-cell">
                <span class="en">General Grade:<span class="val-text" style="font-size: 14px;">${result.generalGrade}</span></span>
                <span class="ar">التقدير العام</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Second Term Exam Result Heading -->
        <div style="background-color: #1E5631; color: white; padding: 4px; text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 6px;" class="bilingual-cell">
          <span class="en" style="width: 50%; text-align: left; padding-left: 10px;">${result.term} Examination Result</span>
          <span class="ar" style="width: 50%; text-align: right; padding-right: 10px;">كشف درجات الامتحان والتقييم</span>
        </div>

        <h3 style="color: #1E5631; font-size: 12px; margin-bottom: 4px;">Tahfeezh Section (Islamic Studies) / قسم التحفيظ (الدراسات الإسلامية)</h3>
        <!-- Subject Grades Table -->
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
              <th style="width: 11%;">20% (CA1)</th>
              <th style="width: 12%;">20% (CA2)</th>
            </tr>
          </thead>
          <tbody>
            ${tahfeezhRows}
          </tbody>
        </table>

        <h3 style="color: #1E5631; font-size: 12px; margin-bottom: 4px; margin-top: 8px;">Academic Subjects / المواد الأكاديمية</h3>
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
              <th style="width: 11%;">20% (CA1)</th>
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
            <div class="tahfeezh-val">${result.tahfeezhDetails.absenceOfHifz}</div>
          </div>
          <div class="tahfeezh-col">
            <div class="tahfeezh-title bilingual-cell">
              <span class="en">Attendance (Absent)</span>
              <span class="ar">الغياب</span>
            </div>
            <div class="tahfeezh-val" style="font-size: 11px;">
              Present: <b>${result.tahfeezhDetails.daysPresent || '-'}</b><br>
              Absent: <b>${result.tahfeezhDetails.daysAbsent || '0'}</b>
            </div>
          </div>
          <div class="tahfeezh-col">
            <div class="tahfeezh-title bilingual-cell">
              <span class="en">Memorization (From -> To Surah)</span>
              <span class="ar">من سورة إلى سورة</span>
            </div>
            <div class="tahfeezh-val" style="font-size: 12px; display: flex; justify-content: space-around;">
              <span>From: <b>${result.tahfeezhDetails.fromSurah || '-'}</b></span>
              <span>To: <b>${result.tahfeezhDetails.toSurah || '-'}</b></span>
            </div>
          </div>
          <div class="tahfeezh-col">
            <div class="tahfeezh-title bilingual-cell">
              <span class="en">Memorized Pages</span>
              <span class="ar">أوجه الحفظ</span>
            </div>
            <div class="tahfeezh-val">${result.tahfeezhDetails.memorizedPages || '-'}</div>
          </div>
        </div>

        <!-- Totals Block -->
        <div class="totals-section">
          <div class="total-box">
            <div class="total-title bilingual-cell">
              <span class="en">Supervisor's Recommendations</span>
              <span class="ar">توصيات المشرف التربوي</span>
            </div>
            <div class="cursive-recommendation">${result.supervisorRecommendations || 'Masha Allah'}</div>
          </div>
          <div class="total-box">
            <div class="total-title bilingual-cell">
              <span class="en">Final Average</span>
              <span class="ar">المعدل النهائي</span>
            </div>
            <div class="total-val">${result.finalAverage}</div>
          </div>
          <div class="total-box">
            <div class="total-title bilingual-cell">
              <span class="en">Total Mark</span>
              <span class="ar">الدرجة الإجمالية</span>
            </div>
            <div class="total-val">${result.totalMark}</div>
          </div>
        </div>

        <!-- Evaluations and Criteria Section -->
        <div class="eval-criteria-container">
          <!-- Evaluations Table -->
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

          <!-- Criteria Table -->
          <div>
            <table class="criteria-table">
              <thead>
                <tr>
                  <th style="width: 60%;">
                    <div class="bilingual-cell">
                      <span class="en">General Evaluation Criteria</span>
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
                <tr>
                  <td class="small-text font-bold">Excellent (A) 100-80</td>
                  <td class="small-text center bilingual-cell"><span class="en">5-Excellent</span><span class="ar">ممتاز</span></td>
                </tr>
                <tr>
                  <td class="small-text font-bold">V. Good (B) 79-70</td>
                  <td class="small-text center bilingual-cell"><span class="en">4-V. Good</span><span class="ar">جيد جدا</span></td>
                </tr>
                <tr>
                  <td class="small-text font-bold">Good (C) 69-60</td>
                  <td class="small-text center bilingual-cell"><span class="en">3-Good</span><span class="ar">جيد</span></td>
                </tr>
                <tr>
                  <td class="small-text font-bold">Pass (D) 50-59</td>
                  <td class="small-text center bilingual-cell"><span class="en">2-Fair</span><span class="ar">مقبول</span></td>
                </tr>
                <tr>
                  <td class="small-text font-bold">Fail (F) 49-0</td>
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
              <span class="en">Teacher's Name:</span> <span class="footer-val">${result.teacherName}</span>
            </div>
            <div class="footer-field" style="margin-top: 6px;">
              <span class="en">Teacher's Recommendations:</span>
              <div class="cursive-recommendation" style="text-align: left; font-size: 13px; min-height: 25px; margin-top: 2px;">
                ${result.teacherRecommendations || 'A good and disciplined student. Keep it up.'}
              </div>
            </div>
            <div class="footer-field" style="margin-top: 8px;">
              <span class="en">Next Term Begins:</span> <span class="footer-val">${result.nextTermBegins}</span>
            </div>
          </div>
          
          <div>
            <div class="footer-field">
              <span class="en">Date Issued:</span> <span class="footer-val">${result.dateIssued}</span>
            </div>
            <div class="footer-field" style="margin-top: 6px;">
              <span class="en">Exam Officer's Sign:</span>
              <div class="sign-placeholder">Approved Online</div>
            </div>
            <div class="footer-field" style="margin-top: 6px;">
              <span class="en">Head Teacher's Comments & Sign:</span>
              <div class="cursive-recommendation" style="text-align: left; font-size: 13px; margin-top: 2px;">
                ${result.headTeacherComments || 'An Outstanding Performance.'}
              </div>
            </div>
          </div>
        </div>

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

    const student = await Student.findById(result.studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student details not found' });
    }

    // Security check: if parent, ensure they only download their child's result
    if (req.user?.role === 'PARENT') {
      if (student.admissionNumber !== req.user.admissionNumber) {
        return res.status(403).json({ message: 'Unauthorized access to this PDF' });
      }
    }

    const htmlContent = generateReportHtml(result, student);

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

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
    const filename = `Report_${student.admissionNumber.replace('/', '_')}_${result.term.replace(' ', '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return res.status(500).json({ message: 'Server error generating PDF', error: error.message });
  }
};
