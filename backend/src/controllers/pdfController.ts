import { Response } from 'express';
import puppeteer from 'puppeteer-core';
// @ts-ignore
import chromium from '@sparticuz/chromium';
import { AuthRequest } from '../middleware/auth';
import Result from '../models/Result';
import Student from '../models/Student';
import User from '../models/User';
import Invoice from '../models/Invoice';
import Tenant from '../models/Tenant';
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

// Helper to calculate age dynamically matching format: "15yrs 5'"
const calculateAge = (dobString: string): string => {
  if (!dobString) return '—';
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) {
    const cleanDate = dobString.replace(/^[A-Za-z]+,\s*/, '');
    const parsed = new Date(cleanDate);
    if (isNaN(parsed.getTime())) return dobString;
    return formatAge(parsed);
  }
  return formatAge(dob);
};

const formatAge = (dob: Date): string => {
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
    years--;
    months += 12;
  }
  return `${years}yrs ${months}'`;
};

// Custom layout for Al-Qalam Academy
const generateAlQalamReportHtml = (result: any, student: any, tenant: any, classPositionString: string) => {
  const primaryColor = tenant.branding?.primaryColor || '#0A2240';
  const secondaryColor = tenant.branding?.secondaryColor || '#d4af37';
  const logo = tenant.branding?.logo || SCHOOL_LOGO_BASE64;
  const schoolName = tenant.name || 'Al-Qalam Academy';
  const schoolNameArabic = tenant.nameArabic || '';
  const subHeader = tenant.subHeader || 'MOTTO: SUCCESS THROUGH HARDWORK';
  const address = tenant.contact?.address || 'Kaduna, Nigeria';
  const phoneNumbers = tenant.contact?.phoneNumbers || '';
  const email = tenant.contact?.email || '';

  const gradedSubjects = result.subjects.filter((s: any) => s.isGraded);
  const gradedSubjectsCount = gradedSubjects.length || 1;

  const renderRatingRow = (label: string, ratingValue: number) => {
    const r = Number(ratingValue) || 5;
    return `
      <tr>
        <td style="border: 1px solid #c5d5c5; padding: 2.2px 4px; font-size: 8.5px; font-weight: 500;">${label}</td>
        <td style="border: 1px solid #c5d5c5; padding: 2px; font-weight: bold; font-size: 9.5px; color: ${primaryColor};" class="center">${r === 5 ? '✓' : ''}</td>
        <td style="border: 1px solid #c5d5c5; padding: 2px; font-weight: bold; font-size: 9.5px; color: ${primaryColor};" class="center">${r === 4 ? '✓' : ''}</td>
        <td style="border: 1px solid #c5d5c5; padding: 2px; font-weight: bold; font-size: 9.5px; color: ${primaryColor};" class="center">${r === 3 ? '✓' : ''}</td>
        <td style="border: 1px solid #c5d5c5; padding: 2px; font-weight: bold; font-size: 9.5px; color: ${primaryColor};" class="center">${r === 2 ? '✓' : ''}</td>
        <td style="border: 1px solid #c5d5c5; padding: 2px; font-weight: bold; font-size: 9.5px; color: ${primaryColor};" class="center">${r === 1 ? '✓' : ''}</td>
      </tr>
    `;
  };

  const gradesList = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'];
  const counts: Record<string, number> = { A1: 0, B2: 0, B3: 0, C4: 0, C5: 0, C6: 0, D7: 0, E8: 0, F9: 0 };
  result.subjects.forEach((s: any) => {
    if (s.isGraded && counts[s.grade] !== undefined) {
      counts[s.grade]++;
    }
  });

  const aff = result.affectiveDomain || {};
  const psych = result.psychomotorSkills || {};
  const cog = result.cognitiveDomain || {};

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Al-Qalam Assessment Sheet - ${escapeHtml(student.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;500;600;700&family=Amiri:wght@400;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        @page {
          size: A4;
          margin: 4mm;
        }
        body {
          font-family: 'Inter', 'Cairo', sans-serif;
          color: #1a1a1a;
          background: #ffffff;
          padding: 0;
          margin: 0;
          width: 100%;
          height: 100%;
          font-size: 9.5px;
          line-height: 1.15;
          -webkit-print-color-adjust: exact;
        }
        .outer-border {
          border: 3.5px double ${primaryColor};
          padding: 8px;
          width: 100%;
          height: calc(297mm - 8mm);
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        
        /* ── Header ── */
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid ${primaryColor};
          padding-bottom: 4px;
          margin-bottom: 5px;
        }
        .header-logo {
          width: 75px;
          height: 75px;
          object-fit: contain;
        }
        .header-text {
          text-align: center;
          flex-grow: 1;
          padding: 0 10px;
        }
        .header-text h1 {
          font-family: 'Cairo', sans-serif;
          font-size: 24px;
          color: ${primaryColor};
          margin-bottom: 2px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .header-text h2 {
          font-family: 'Times New Roman', 'Times', serif;
          font-size: 13px;
          color: #1a1a1a;
          margin-bottom: 2px;
          font-weight: bold;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .header-text p.contact {
          font-size: 9.5px;
          color: #333;
          margin-bottom: 2px;
        }
        .header-text p.sub {
          font-family: 'Times New Roman', 'Times', serif;
          font-size: 12.5px;
          font-weight: bold;
          color: ${primaryColor};
          margin-top: 2px;
          text-transform: uppercase;
        }

        /* ── Student info table ── */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
        }
        .info-table td {
          border: 1px solid #c5d5c5;
          padding: 3px 5px;
          font-size: 9px;
          background: #fafcfa;
        }
        .val-text {
          font-weight: bold;
          color: ${primaryColor};
        }

        /* ── Results table ── */
        .results-table {
          width: 100%;
          border-collapse: collapse;
        }
        .results-table th, .results-table td {
          border: 1px solid #c5d5c5;
          padding: 3px 4px;
        }
        .results-table th {
          background: #eef4ee;
          color: ${primaryColor};
          font-size: 9px;
          text-align: center;
          font-weight: bold;
        }
        .results-table td {
          font-size: 10px;
        }
        .results-table td.center {
          text-align: center;
        }
        .font-bold {
          font-weight: bold;
        }
        .center {
          text-align: center;
        }
        .bilingual-cell {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .en {
          font-family: 'Inter', sans-serif;
          text-align: left;
        }
        .ar {
          font-family: 'Cairo', sans-serif;
          text-align: right;
          direction: rtl;
          color: #555;
          font-size: 8.5px;
        }
      </style>
    </head>
    <body>
      <div class="outer-border">
        <!-- Header -->
        <div class="header-container">
          <img src="${logo.startsWith('data:') ? logo : SCHOOL_LOGO_BASE64}" class="header-logo" alt="School Logo" />
          <div class="header-text">
            <h1>${schoolName.toUpperCase()} KADUNA</h1>
            <h2>${subHeader}</h2>
            <p class="contact">${address} | Tel: ${phoneNumbers}</p>
            <p class="contact">Email: ${email}</p>
            <p class="sub">${result.term.toUpperCase()} STUDENT'S PERFORMANCE REPORT</p>
          </div>
          ${student.picture ? `
            <img src="${escapeHtml(student.picture)}" class="header-logo" style="border: 1.5px solid ${primaryColor}; border-radius: 4px; object-fit: cover;" alt="Student Passport" />
          ` : `
            <div style="width: 75px; height: 75px; border: 1.5px solid ${primaryColor}; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #fafafa; color: #888; font-size: 7px; text-align: center; padding: 4px;" class="header-logo">
              <b>PASSPORT PHOTO</b>
            </div>
          `}
        </div>

        <!-- Student Info Table -->
        <table class="info-table">
          <tr>
            <td style="width: 55%;">NAME: <span class="val-text">${escapeHtml(student.name)}</span></td>
            <td style="width: 25%;">CLASS: <span class="val-text">${escapeHtml(student.level)}</span></td>
            <td style="width: 20%;">SESSION: <span class="val-text">${escapeHtml(result.academicYear)}</span></td>
          </tr>
          <tr>
            <td>ADMISSION NO: <span class="val-text">${escapeHtml(student.admissionNumber)}</span></td>
            <td>D.O.B: <span class="val-text">${escapeHtml(student.dob || '—')}</span></td>
            <td>AGE: <span class="val-text">${escapeHtml(calculateAge(student.dob))}</span></td>
          </tr>
          <tr>
            <td>GENDER: <span class="val-text">${escapeHtml(student.gender || '—')}</span></td>
            <td>HOUSE: <span class="val-text">${escapeHtml(student.house || '—')}</span></td>
            <td>CLUB/SOCIETY: <span class="val-text">${escapeHtml(student.club || '—')}</span></td>
          </tr>
        </table>

        <!-- Main content stacked side-by-side -->
        <div style="display: grid; grid-template-columns: 2.1fr 1fr; gap: 8px; margin-bottom: 6px;">
          
          <!-- Cognitive Domain (Left Column) -->
          <div>
            <div style="background: ${primaryColor}; color: white; padding: 3px 6px; font-weight: bold; font-size: 9px; text-align: center; text-transform: uppercase; margin-bottom: 3px;">
              COGNITIVE DOMAIN (SUBJECTS ASSESSMENT)
            </div>
            <table class="results-table">
              <thead>
                <tr>
                  <th style="width: 36%;">SUBJECTS</th>
                  <th style="width: 8%;">C.A.<br><span style="font-size: 8px; font-weight: normal;">60</span></th>
                  <th style="width: 8%;">EXAM<br><span style="font-size: 8px; font-weight: normal;">40</span></th>
                  <th style="width: 10%;">TERM TOTAL<br><span style="font-size: 8px; font-weight: normal;">100</span></th>
                  <th style="width: 10%;">SUBJ.<br>POSN</th>
                  <th style="width: 8%;">GRADE</th>
                  <th style="width: 12%;">GRADE<br>REMARKS</th>
                  <th style="width: 10%;">CLASS<br>AVERAGE</th>
                  <th style="width: 8%;">1ST<br>TERM</th>
                </tr>
              </thead>
              <tbody>
                ${result.subjects.map((s: any) => `
                  <tr>
                    <td class="bilingual-cell" style="font-weight: bold;">
                      <span class="en">${escapeHtml(s.subjectName)}</span>
                      <span class="ar">${escapeHtml(s.subjectNameArabic)}</span>
                    </td>
                    <td class="center">${s.isGraded ? s.score60 : '—'}</td>
                    <td class="center">${s.isGraded ? s.score40 : '—'}</td>
                    <td class="center font-bold" style="color: ${primaryColor};">${s.isGraded ? s.score100 : '—'}</td>
                    <td class="center">${s.isGraded ? (s.subjectPosition || '1st') : '—'}</td>
                    <td class="center font-bold" style="color: ${primaryColor};">${s.isGraded ? s.grade : '—'}</td>
                    <td class="center" style="font-size: 8.5px; font-weight: bold;">${s.isGraded ? (s.subjectRemarks || '') : '—'}</td>
                    <td class="center">${s.isGraded ? (s.classAverage || s.score100) : '—'}</td>
                    <td class="center">${s.isGraded ? (s.prevTermScore || '—') : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Attendance, Affective & Psychomotor Domains (Right Column) -->
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <!-- Attendance -->
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: ${primaryColor}; color: white; font-weight: bold; font-size: 8.5px;">
                  <th colspan="2" style="padding: 2.5px; text-transform: uppercase;">Attendance Summary</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border: 1px solid #c5d5c5; padding: 2.5px; font-size: 8.5px;">No. of Times Sch Opened</td>
                  <td style="border: 1px solid #c5d5c5; padding: 2.5px; font-weight: bold;" class="center">${result.attendanceSummary?.timesOpened || 0}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #c5d5c5; padding: 2.5px; font-size: 8.5px;">No. of Times Present</td>
                  <td style="border: 1px solid #c5d5c5; padding: 2.5px; font-weight: bold;" class="center">${result.attendanceSummary?.timesPresent || 0} ${result.attendanceSummary?.timesOpened ? `(${Math.round((result.attendanceSummary.timesPresent / result.attendanceSummary.timesOpened) * 100)}%)` : ''}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #c5d5c5; padding: 2.5px; font-size: 8.5px;">No. of Times Absent</td>
                  <td style="border: 1px solid #c5d5c5; padding: 2.5px; font-weight: bold;" class="center">${result.attendanceSummary?.timesAbsent || 0}</td>
                </tr>
              </tbody>
            </table>

            <!-- Affective Domain -->
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: ${primaryColor}; color: white; font-weight: bold; font-size: 8.5px;">
                  <th style="padding: 2.5px;">AFFECTIVE DOMAIN</th>
                  <th style="width: 18px; padding: 2.5px;">5</th>
                  <th style="width: 18px; padding: 2.5px;">4</th>
                  <th style="width: 18px; padding: 2.5px;">3</th>
                  <th style="width: 18px; padding: 2.5px;">2</th>
                  <th style="width: 18px; padding: 2.5px;">1</th>
                </tr>
              </thead>
              <tbody>
                ${renderRatingRow('Attentiveness', aff.attentiveness)}
                ${renderRatingRow('Honesty', aff.honesty)}
                ${renderRatingRow('Neatness', aff.neatness)}
                ${renderRatingRow('Politeness', aff.politeness)}
                ${renderRatingRow('Punctuality/Assembly', aff.punctuality)}
                ${renderRatingRow('Self Control/Calmness', aff.selfControl)}
                ${renderRatingRow('Obedience', aff.obedience)}
                ${renderRatingRow('Reliability', aff.reliability)}
                ${renderRatingRow('Sense Of Responsibility', aff.responsibility)}
                ${renderRatingRow('Relationship With Others', aff.relationship)}
              </tbody>
            </table>

            <!-- Psychomotor - Skills -->
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: ${primaryColor}; color: white; font-weight: bold; font-size: 8.5px;">
                  <th style="padding: 2.5px;">PSYCHOMOTOR - SKILLS</th>
                  <th style="width: 18px; padding: 2.5px;">5</th>
                  <th style="width: 18px; padding: 2.5px;">4</th>
                  <th style="width: 18px; padding: 2.5px;">3</th>
                  <th style="width: 18px; padding: 2.5px;">2</th>
                  <th style="width: 18px; padding: 2.5px;">1</th>
                </tr>
              </thead>
              <tbody>
                ${renderRatingRow('Handling Of Tools', psych.handlingTools)}
                ${renderRatingRow('Drawing/ Painting', psych.drawingPainting)}
                ${renderRatingRow('Handwriting', psych.handwriting)}
                ${renderRatingRow('Public Speaking', psych.publicSpeaking)}
                ${renderRatingRow('Speech Fluency', psych.speechFluency)}
                ${renderRatingRow('Sports & Games', psych.sportsGames)}
              </tbody>
            </table>
            
            <!-- Cognitive Domain -->
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: ${primaryColor}; color: white; font-weight: bold; font-size: 8.5px;">
                  <th style="padding: 2.5px;">COGNITIVE DOMAIN</th>
                  <th style="width: 18px; padding: 2.5px;">5</th>
                  <th style="width: 18px; padding: 2.5px;">4</th>
                  <th style="width: 18px; padding: 2.5px;">3</th>
                  <th style="width: 18px; padding: 2.5px;">2</th>
                  <th style="width: 18px; padding: 2.5px;">1</th>
                </tr>
              </thead>
              <tbody>
                ${renderRatingRow('Verbal Skills', cog.verbalSkills)}
                ${renderRatingRow('Writing Skills', cog.writingSkills)}
                ${renderRatingRow('Reading Skills', cog.readingSkills)}
                ${renderRatingRow('Calculation Skills', cog.calculationSkills)}
                ${renderRatingRow('Memory Recall', cog.memoryRecall)}
                ${renderRatingRow('Creativity', cog.creativity)}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Grade analysis row -->
        <div style="display: grid; grid-template-columns: 1fr 1.6fr 1fr; gap: 8px; margin-bottom: 6px;">
          <!-- Performance Summary -->
          <div style="border: 1px solid #c5d5c5; border-radius: 3px; padding: 4px; background: #fafcfa;">
            <div style="font-weight: bold; border-bottom: 1.5px solid ${primaryColor}; padding-bottom: 2px; margin-bottom: 4px; color: ${primaryColor}; text-align: center; font-size: 8.5px; text-transform: uppercase;">Performance Summary</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 8.5px; line-height: 1.3;">
              <tr><td>Total Obtained:</td><td class="center font-bold" style="color: ${primaryColor}; font-size: 9px;">${result.totalMark.toFixed(1)}</td></tr>
              <tr><td>Total Obtainable:</td><td class="center font-bold">${gradedSubjectsCount * 100}</td></tr>
              <tr><td>Total Subjects:</td><td class="center font-bold">${gradedSubjectsCount}</td></tr>
              <tr><td>%TAGE (Percentage):</td><td class="center font-bold" style="color: ${primaryColor}; font-size: 9px;">${result.finalAverage.toFixed(2)}%</td></tr>
              <tr><td>GRADE:</td><td class="center font-bold" style="color: ${primaryColor}; font-size: 9px;">${result.generalGrade}</td></tr>
              <tr><td colspan="2" class="center font-bold" style="border-top: 1px solid #c5d5c5; padding-top: 3px; font-size: 8.5px; color: ${primaryColor};">${classPositionString}</td></tr>
            </table>
          </div>

          <!-- Grade Analysis & Rating Indices -->
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <!-- Grade Analysis -->
            <div style="border: 1px solid #c5d5c5; border-radius: 3px; padding: 4px; background: #fafcfa;">
              <div style="font-weight: bold; border-bottom: 1.5px solid ${primaryColor}; padding-bottom: 2px; margin-bottom: 4px; color: ${primaryColor}; text-align: center; font-size: 8.5px; text-transform: uppercase;">Grade Analysis</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
                <thead>
                  <tr style="background: #eef4ee; color: ${primaryColor}; font-weight: bold; border-bottom: 1px solid #c5d5c5;">
                    <th style="padding: 2px; border: 1px solid #c5d5c5;">GRADE</th>
                    ${gradesList.map(g => `<th style="padding: 2px; border: 1px solid #c5d5c5;">${g}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 2px; font-weight: bold; border: 1px solid #c5d5c5;">NO.</td>
                    ${gradesList.map(g => `<td style="padding: 2px; border: 1px solid #c5d5c5; font-weight: bold;" class="center">${counts[g] || '-'}</td>`).join('')}
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Rating Indices -->
            <div style="border: 1px solid #c5d5c5; border-radius: 3px; padding: 4px; background: #fafcfa; font-size: 6.5px; line-height: 1.2;">
              <div style="font-weight: bold; color: ${primaryColor}; margin-bottom: 2px; font-size: 7.5px; text-transform: uppercase;">Rating Indices</div>
              <div>5 - Maintains an Excellent degree of Observable (Obs) traits</div>
              <div>4 - Maintains a High level of Obs traits &nbsp;&nbsp; 3 - Acceptable level of Obs traits</div>
              <div>2 - Shows Minimal regard for Obs traits &nbsp;&nbsp;&nbsp; 1 - Has No regard for Observable traits</div>
            </div>
          </div>

          <!-- Grade Scale -->
          <div style="border: 1px solid #c5d5c5; border-radius: 3px; padding: 4px; background: #fafcfa; font-size: 7px;">
            <div style="font-weight: bold; border-bottom: 1.5px solid ${primaryColor}; padding-bottom: 2px; margin-bottom: 4px; color: ${primaryColor}; text-align: center; font-size: 8.5px; text-transform: uppercase;">Grade Scale</div>
            <table style="width: 100%; border-collapse: collapse; line-height: 1.15;">
              <tr><td class="font-bold" style="color: ${primaryColor};">A1</td><td>85-100%</td><td class="font-bold">EXCELLENT</td></tr>
              <tr><td class="font-bold" style="color: ${primaryColor};">B2</td><td>75-84.9%</td><td class="font-bold">VERY GOOD</td></tr>
              <tr><td class="font-bold" style="color: ${primaryColor};">B3</td><td>70-74.9%</td><td class="font-bold">GOOD</td></tr>
              <tr><td class="font-bold" style="color: ${primaryColor};">C4</td><td>65-69.9%</td><td class="font-bold">CREDIT</td></tr>
              <tr><td class="font-bold" style="color: ${primaryColor};">C5</td><td>60-64.9%</td><td class="font-bold">CREDIT</td></tr>
              <tr><td class="font-bold" style="color: ${primaryColor};">C6</td><td>50-59.9%</td><td class="font-bold">CREDIT</td></tr>
              <tr><td class="font-bold" style="color: ${primaryColor};">D7</td><td>45-49.9%</td><td class="font-bold">PASS</td></tr>
              <tr><td class="font-bold" style="color: ${primaryColor};">E8</td><td>40-44.9%</td><td class="font-bold">PASS</td></tr>
              <tr><td class="font-bold" style="color: ${primaryColor};">F9</td><td>0-39.9%</td><td class="font-bold">FAIL</td></tr>
            </table>
          </div>
        </div>

        <!-- Remarks Table -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 3px; border: 1px solid #c5d5c5; font-size: 8.5px; line-height: 1.25;">
          <tr style="border-bottom: 1px solid #c5d5c5;">
            <td style="width: 15%; padding: 4px 6px; font-weight: bold; color: ${primaryColor}; background: #fafcfa; border-right: 1px solid #c5d5c5;">Class Teacher's Remark</td>
            <td style="width: 60%; padding: 4px 6px; font-style: italic;">${escapeHtml(result.teacherRecommendations)}</td>
            <td style="width: 25%; padding: 4px 6px; font-weight: bold; text-align: right; border-left: 1px solid #c5d5c5;">
              <div style="font-size: 7.5px; color: #555; text-transform: uppercase;">Teacher Name</div>
              <div style="font-size: 9.5px; color: ${primaryColor}; font-weight: bold; margin-top: 2px;">${escapeHtml(result.teacherName)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; font-weight: bold; color: ${primaryColor}; background: #fafcfa; border-right: 1px solid #c5d5c5;">Principal's Remark</td>
            <td style="padding: 4px 6px; font-style: italic;">${escapeHtml(result.headTeacherComments || 'A Remarkable and Excellent Result!!.. Keep it Up..')}</td>
            <td style="padding: 4px 6px; font-weight: bold; text-align: right; border-left: 1px solid #c5d5c5;">
              ${tenant.branding?.principalSignature ? `
                <img src="${tenant.branding.principalSignature}" style="max-height: 20px; object-fit: contain; display: block; margin-left: auto;" alt="Signature" />
              ` : `
                <div style="font-family: 'Amiri', serif; font-size: 9px; font-style: italic; color: ${primaryColor}; line-height: 1;">Shamsuddeen Sani</div>
              `}
              <div style="font-size: 7.5px; color: #555; text-transform: uppercase; margin-top: 2px;">Principal Signature</div>
            </td>
          </tr>
        </table>

        <!-- Footer next term date -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding: 4px 10px; background: #fafcfa; border: 1px solid #c5d5c5; border-radius: 3px;">
          <div>
            <span style="font-weight: bold; color: #555; font-size: 8.5px; text-transform: uppercase;">Next Term Begins:</span>
            <span style="font-weight: bold; color: ${primaryColor}; margin-left: 6px; font-size: 9.5px;">${escapeHtml(result.nextTermBegins || 'Mon, 13-April-2026')}</span>
          </div>
          <div style="font-size: 8.5px; font-weight: bold; color: #555;">
            DATE: <span style="color: ${primaryColor};">${escapeHtml(result.dateIssued || new Date().toLocaleDateString('en-GB'))}</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 4px; font-family: 'Amiri', serif; font-size: 9px; color: #999; font-style: italic; letter-spacing: 0.5px;">
          Al-Qalam Academy Kaduna © 2026 - Powered by SmartSchool Africa
        </div>
      </div>
    </body>
    </html>
  `;
};

// Custom layout for Conventional Academic-only schools (no Arabic, no Islamic/Tahfeez)
const generateConventionalReportHtml = (result: any, student: any, tenant: any, classPositionString: string) => {
  const primaryColor = tenant.branding?.primaryColor || '#1E5631';
  const secondaryColor = tenant.branding?.secondaryColor || '#d4af37';
  const logo = tenant.branding?.logo || SCHOOL_LOGO_BASE64;
  const schoolName = tenant.name || 'SmartSchool';
  const subHeader = tenant.subHeader || 'Academic Excellence & Moral Discipline';
  const address = tenant.contact?.address || '';
  const phoneNumbers = tenant.contact?.phoneNumbers || '';
  const email = tenant.contact?.email || '';

  const gradedSubjects = result.subjects.filter((s: any) => s.isGraded);
  const gradedSubjectsCount = gradedSubjects.length || 1;

  const renderRatingRow = (label: string, ratingValue: number) => {
    const r = Number(ratingValue) || 5;
    return `
      <tr>
        <td style="border: 1px solid #c5d5c5; padding: 2.2px 4px; font-size: 8.5px; font-weight: 500;">${label}</td>
        <td style="border: 1px solid #c5d5c5; padding: 2px; font-weight: bold; font-size: 9.5px; color: ${primaryColor};" class="center">${r === 5 ? '✓' : ''}</td>
        <td style="border: 1px solid #c5d5c5; padding: 2px; font-weight: bold; font-size: 9.5px; color: ${primaryColor};" class="center">${r === 4 ? '✓' : ''}</td>
        <td style="border: 1px solid #c5d5c5; padding: 2px; font-weight: bold; font-size: 9.5px; color: ${primaryColor};" class="center">${r === 3 ? '✓' : ''}</td>
        <td style="border: 1px solid #c5d5c5; padding: 2px; font-weight: bold; font-size: 9.5px; color: ${primaryColor};" class="center">${r === 2 ? '✓' : ''}</td>
        <td style="border: 1px solid #c5d5c5; padding: 2px; font-weight: bold; font-size: 9.5px; color: ${primaryColor};" class="center">${r === 1 ? '✓' : ''}</td>
      </tr>
    `;
  };

  const gradesList = ['A', 'B', 'C', 'D', 'F'];
  const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  result.subjects.forEach((s: any) => {
    if (s.isGraded && counts[s.grade] !== undefined) {
      counts[s.grade]++;
    }
  });

  const aff = result.affectiveDomain || {};
  const psych = result.psychomotorSkills || {};
  const cog = result.cognitiveDomain || {};

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Report Sheet - ${escapeHtml(student.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        @page {
          size: A4;
          margin: 4mm;
        }
        body {
          font-family: 'Times New Roman', 'Times', serif;
          color: #1a1a1a;
          background: #ffffff;
          padding: 0;
          margin: 0;
          width: 100%;
          height: 100%;
          font-size: 9.5px;
          line-height: 1.15;
          -webkit-print-color-adjust: exact;
        }
        .outer-border {
          border: 3.5px double ${primaryColor};
          padding: 8px;
          width: 100%;
          height: calc(297mm - 8mm);
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        
        /* ── Header ── */
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid ${primaryColor};
          padding-bottom: 4px;
          margin-bottom: 5px;
        }
        .header-logo {
          width: 75px;
          height: 75px;
          object-fit: contain;
          border-radius: 6px;
        }
        .header-text {
          text-align: center;
          flex-grow: 1;
          padding: 0 10px;
        }
        .header-text h1 {
          font-family: 'Times New Roman', 'Times', serif;
          font-size: 23px;
          color: ${primaryColor};
          margin-bottom: 2px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .header-text h2 {
          font-family: 'Times New Roman', 'Times', serif;
          font-size: 12.5px;
          color: #555;
          margin-bottom: 2px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .header-text p.contact {
          font-size: 9px;
          color: #444;
          margin-bottom: 2px;
          font-family: 'Inter', sans-serif;
        }
        .header-text p.sub {
          font-family: 'Times New Roman', 'Times', serif;
          font-size: 11.5px;
          font-weight: bold;
          color: ${primaryColor};
          margin-top: 3px;
          text-transform: uppercase;
        }
        
        /* ── Student info table ── */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
        }
        .info-table td {
          border: 1px solid #c5d5c5;
          padding: 3.5px 5px;
          font-size: 9px;
          font-weight: 500;
          background: #fafcfa;
          font-family: 'Inter', sans-serif;
        }
        .val-text {
          font-weight: bold;
          color: ${primaryColor};
        }
        
        /* ── Results table ── */
        .results-table {
          width: 100%;
          border-collapse: collapse;
        }
        .results-table th {
          background: #eef4ee;
          color: ${primaryColor};
          border: 1px solid #c5d5c5;
          padding: 3.5px;
          font-size: 8.5px;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
        }
        .results-table td {
          border: 1px solid #c5d5c5;
          padding: 3.5px;
          font-size: 9.5px;
          font-family: 'Inter', sans-serif;
        }
        .results-table td.center {
          text-align: center;
        }
        .font-bold {
          font-weight: bold;
        }
        .center {
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="outer-border">
        <!-- Header -->
        <div class="header-container">
          <img src="${logo.startsWith('data:') ? logo : SCHOOL_LOGO_BASE64}" class="header-logo" alt="School Logo" />
          <div class="header-text">
            <h1>${schoolName.toUpperCase()}</h1>
            <h2>${subHeader}</h2>
            <p class="contact">${address} | Tel: ${phoneNumbers}</p>
            <p class="contact">Email: ${email}</p>
            <p class="sub">${result.term.toUpperCase()} STUDENT'S PERFORMANCE REPORT</p>
          </div>
          ${student.picture ? `
            <img src="${escapeHtml(student.picture)}" class="header-logo" style="border: 1.5px solid ${primaryColor}; border-radius: 4px; object-fit: cover;" alt="Student Passport" />
          ` : `
            <div style="width: 75px; height: 75px; border: 1.5px solid ${primaryColor}; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #fafafa; color: #888; font-size: 7px; text-align: center; padding: 4px;" class="header-logo">
              <b>PASSPORT PHOTO</b>
            </div>
          `}
        </div>

        <!-- Student Info Table -->
        <table class="info-table">
          <tr>
            <td style="width: 55%;">NAME: <span class="val-text">${escapeHtml(student.name)}</span></td>
            <td style="width: 25%;">CLASS: <span class="val-text">${escapeHtml(student.level)}</span></td>
            <td style="width: 20%;">SESSION: <span class="val-text">${escapeHtml(result.academicYear)}</span></td>
          </tr>
          <tr>
            <td>ADMISSION NO: <span class="val-text">${escapeHtml(student.admissionNumber)}</span></td>
            <td>D.O.B: <span class="val-text">${escapeHtml(student.dob || '—')}</span></td>
            <td>AGE: <span class="val-text">${escapeHtml(calculateAge(student.dob))}</span></td>
          </tr>
          <tr>
            <td>GENDER: <span class="val-text">${escapeHtml(student.gender || '—')}</span></td>
            <td>HOUSE: <span class="val-text">${escapeHtml(student.house || '—')}</span></td>
            <td>CLUB/SOCIETY: <span class="val-text">${escapeHtml(student.club || '—')}</span></td>
          </tr>
        </table>

        <!-- Main content stacked side-by-side -->
        <div style="display: grid; grid-template-columns: 2.1fr 1fr; gap: 8px; margin-bottom: 6px;">
          
          <!-- Cognitive Domain (Left Column) -->
          <div>
            <div style="background: ${primaryColor}; color: white; padding: 3px 6px; font-weight: bold; font-size: 9px; text-align: center; text-transform: uppercase; margin-bottom: 3px;">
              COGNITIVE DOMAIN (SUBJECTS ASSESSMENT)
            </div>
            <table class="results-table">
              <thead>
                <tr>
                  <th style="width: 38%;">SUBJECTS</th>
                  <th style="width: 10%;">CA1<br><span style="font-size: 7px; font-weight: normal;">20</span></th>
                  <th style="width: 10%;">CA2<br><span style="font-size: 7px; font-weight: normal;">20</span></th>
                  <th style="width: 10%;">EXAM<br><span style="font-size: 7px; font-weight: normal;">60</span></th>
                  <th style="width: 12%;">TOTAL<br><span style="font-size: 7px; font-weight: normal;">100</span></th>
                  <th style="width: 10%;">POSN</th>
                  <th style="width: 10%;">GRADE</th>
                  <th style="width: 12%;">CLASS<br>AVERAGE</th>
                  <th style="width: 8%;">PREV<br>TERM</th>
                </tr>
              </thead>
              <tbody>
                ${result.subjects.map((s: any) => `
                  <tr>
                    <td style="font-weight: bold;">
                      <span>${escapeHtml(s.subjectName)}</span>
                    </td>
                    <td class="center">${s.isGraded ? s.score20_1 : '—'}</td>
                    <td class="center">${s.isGraded ? s.score20_2 : '—'}</td>
                    <td class="center">${s.isGraded ? s.score60 : '—'}</td>
                    <td class="center font-bold" style="color: ${primaryColor};">${s.isGraded ? s.score100 : '—'}</td>
                    <td class="center">${s.isGraded ? (s.subjectPosition || '—') : '—'}</td>
                    <td class="center font-bold" style="color: ${primaryColor};">${s.isGraded ? s.grade : '—'}</td>
                    <td class="center">${s.isGraded ? (s.classAverage || s.score100) : '—'}</td>
                    <td class="center">${s.isGraded ? (s.prevTermScore || '—') : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Attendance, Affective & Psychomotor Domains (Right Column) -->
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <!-- Attendance -->
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: ${primaryColor}; color: white; font-weight: bold; font-size: 8.5px;">
                  <th colspan="2" style="padding: 2.5px; text-transform: uppercase;">Attendance Summary</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border: 1px solid #c5d5c5; padding: 2.5px; font-size: 8.5px;">Times School Opened</td>
                  <td style="border: 1px solid #c5d5c5; padding: 2.5px; font-weight: bold;" class="center">${result.attendanceSummary?.timesOpened || 0}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #c5d5c5; padding: 2.5px; font-size: 8.5px;">Times Present</td>
                  <td style="border: 1px solid #c5d5c5; padding: 2.5px; font-weight: bold;" class="center">${result.attendanceSummary?.timesPresent || 0} ${result.attendanceSummary?.timesOpened ? `(${Math.round((result.attendanceSummary.timesPresent / result.attendanceSummary.timesOpened) * 100)}%)` : ''}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #c5d5c5; padding: 2.5px; font-size: 8.5px;">Times Absent</td>
                  <td style="border: 1px solid #c5d5c5; padding: 2.5px; font-weight: bold;" class="center">${result.attendanceSummary?.timesAbsent || 0}</td>
                </tr>
              </tbody>
            </table>

            <!-- Affective Domain -->
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: ${primaryColor}; color: white; font-weight: bold; font-size: 8.5px;">
                  <th style="padding: 2.5px;">AFFECTIVE DOMAIN</th>
                  <th style="width: 18px; padding: 2.5px;">5</th>
                  <th style="width: 18px; padding: 2.5px;">4</th>
                  <th style="width: 18px; padding: 2.5px;">3</th>
                  <th style="width: 18px; padding: 2.5px;">2</th>
                  <th style="width: 18px; padding: 2.5px;">1</th>
                </tr>
              </thead>
              <tbody>
                ${renderRatingRow('Attentiveness', aff.attentiveness)}
                ${renderRatingRow('Honesty', aff.honesty)}
                ${renderRatingRow('Neatness', aff.neatness)}
                ${renderRatingRow('Politeness', aff.politeness)}
                ${renderRatingRow('Punctuality', aff.punctuality)}
                ${renderRatingRow('Self Control', aff.selfControl)}
                ${renderRatingRow('Obedience', aff.obedience)}
                ${renderRatingRow('Reliability', aff.reliability)}
                ${renderRatingRow('Sense Of Responsibility', aff.responsibility)}
                ${renderRatingRow('Relationship With Others', aff.relationship)}
              </tbody>
            </table>

            <!-- Psychomotor - Skills -->
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: ${primaryColor}; color: white; font-weight: bold; font-size: 8.5px;">
                  <th style="padding: 2.5px;">PSYCHOMOTOR - SKILLS</th>
                  <th style="width: 18px; padding: 2.5px;">5</th>
                  <th style="width: 18px; padding: 2.5px;">4</th>
                  <th style="width: 18px; padding: 2.5px;">3</th>
                  <th style="width: 18px; padding: 2.5px;">2</th>
                  <th style="width: 18px; padding: 2.5px;">1</th>
                </tr>
              </thead>
              <tbody>
                ${renderRatingRow('Handling Of Tools', psych.handlingTools)}
                ${renderRatingRow('Drawing & Painting', psych.drawingPainting)}
                ${renderRatingRow('Handwriting', psych.handwriting)}
                ${renderRatingRow('Public Speaking', psych.publicSpeaking)}
                ${renderRatingRow('Speech Fluency', psych.speechFluency)}
                ${renderRatingRow('Sports & Games', psych.sportsGames)}
              </tbody>
            </table>
            
            <!-- Cognitive Domain -->
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: ${primaryColor}; color: white; font-weight: bold; font-size: 8.5px;">
                  <th style="padding: 2.5px;">COGNITIVE DOMAIN</th>
                  <th style="width: 18px; padding: 2.5px;">5</th>
                  <th style="width: 18px; padding: 2.5px;">4</th>
                  <th style="width: 18px; padding: 2.5px;">3</th>
                  <th style="width: 18px; padding: 2.5px;">2</th>
                  <th style="width: 18px; padding: 2.5px;">1</th>
                </tr>
              </thead>
              <tbody>
                ${renderRatingRow('Verbal Skills', cog.verbalSkills)}
                ${renderRatingRow('Writing Skills', cog.writingSkills)}
                ${renderRatingRow('Reading Skills', cog.readingSkills)}
                ${renderRatingRow('Calculation Skills', cog.calculationSkills)}
                ${renderRatingRow('Memory Recall', cog.memoryRecall)}
                ${renderRatingRow('Creativity', cog.creativity)}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Grade analysis row -->
        <div style="display: grid; grid-template-columns: 1fr 1.6fr 1fr; gap: 8px; margin-bottom: 6px;">
          <!-- Performance Summary -->
          <div style="border: 1px solid #c5d5c5; border-radius: 3px; padding: 4px; background: #fafcfa;">
            <div style="font-weight: bold; border-bottom: 1.5px solid ${primaryColor}; padding-bottom: 2px; margin-bottom: 4px; color: ${primaryColor}; text-align: center; font-size: 8.5px; text-transform: uppercase;">Performance Summary</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 8.5px; line-height: 1.3;">
              <tr><td>Total Obtained:</td><td class="center font-bold" style="color: ${primaryColor}; font-size: 9px;">${result.totalMark.toFixed(1)}</td></tr>
              <tr><td>Total Obtainable:</td><td class="center font-bold">${gradedSubjectsCount * 100}</td></tr>
              <tr><td>Total Subjects:</td><td class="center font-bold">${gradedSubjectsCount}</td></tr>
              <tr><td>Percentage:</td><td class="center font-bold" style="color: ${primaryColor}; font-size: 9px;">${result.finalAverage.toFixed(2)}%</td></tr>
              <tr><td>Grade:</td><td class="center font-bold" style="color: ${primaryColor}; font-size: 9px;">${result.generalGrade}</td></tr>
              <tr><td colspan="2" class="center font-bold" style="border-top: 1px solid #c5d5c5; padding-top: 3px; font-size: 8.5px; color: ${primaryColor};">${classPositionString}</td></tr>
            </table>
          </div>

          <!-- Grade Analysis & Rating Indices -->
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <!-- Grade Analysis -->
            <div style="border: 1px solid #c5d5c5; border-radius: 3px; padding: 4px; background: #fafcfa;">
              <div style="font-weight: bold; border-bottom: 1.5px solid ${primaryColor}; padding-bottom: 2px; margin-bottom: 4px; color: ${primaryColor}; text-align: center; font-size: 8.5px; text-transform: uppercase;">Grade Analysis</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
                <thead>
                  <tr style="background: #eef4ee; color: ${primaryColor}; font-weight: bold; border-bottom: 1px solid #c5d5c5;">
                    <th style="padding: 2px; border: 1px solid #c5d5c5;">GRADE</th>
                    ${gradesList.map(g => `<th style="padding: 2px; border: 1px solid #c5d5c5;">${g}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 2px; font-weight: bold; border: 1px solid #c5d5c5;">NO.</td>
                    ${gradesList.map(g => `<td style="padding: 2px; border: 1px solid #c5d5c5; font-weight: bold;" class="center">${counts[g] || '-'}</td>`).join('')}
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Rating Indices -->
            <div style="border: 1px solid #c5d5c5; border-radius: 3px; padding: 4px; background: #fafcfa; font-size: 6.5px; line-height: 1.2;">
              <div style="font-weight: bold; color: ${primaryColor}; margin-bottom: 2px; font-size: 7.5px; text-transform: uppercase;">Rating Indices</div>
              <div>5 - Maintains an Excellent degree of Observable (Obs) traits</div>
              <div>4 - Maintains a High level of Obs traits &nbsp;&nbsp; 3 - Acceptable level of Obs traits</div>
              <div>2 - Shows Minimal regard for Obs traits &nbsp;&nbsp;&nbsp; 1 - Has No regard for Observable traits</div>
            </div>
          </div>

          <!-- Grade Scale -->
          <div style="border: 1px solid #c5d5c5; border-radius: 3px; padding: 4px; background: #fafcfa; font-size: 7px;">
            <div style="font-weight: bold; border-bottom: 1.5px solid ${primaryColor}; padding-bottom: 2px; margin-bottom: 4px; color: ${primaryColor}; text-align: center; font-size: 8.5px; text-transform: uppercase;">Grade Scale</div>
            <table style="width: 100%; border-collapse: collapse; line-height: 1.3;">
              <tr><td class="font-bold" style="color: ${primaryColor};">A</td><td>80 - 100%</td><td class="font-bold">EXCELLENT</td></tr>
              <tr><td class="font-bold" style="color: ${primaryColor};">B</td><td>70 - 79%</td><td class="font-bold">VERY GOOD</td></tr>
              <tr><td class="font-bold" style="color: ${primaryColor};">C</td><td>60 - 69%</td><td class="font-bold">GOOD</td></tr>
              <tr><td class="font-bold" style="color: ${primaryColor};">D</td><td>50 - 59%</td><td class="font-bold">PASS</td></tr>
              <tr><td class="font-bold" style="color: ${primaryColor};">F</td><td>0 - 49%</td><td class="font-bold">FAIL</td></tr>
            </table>
          </div>
        </div>

        <!-- Remarks Table -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 3px; border: 1px solid #c5d5c5; font-size: 8.5px; line-height: 1.25;">
          <tr style="border-bottom: 1px solid #c5d5c5;">
            <td style="width: 15%; padding: 4px 6px; font-weight: bold; color: ${primaryColor}; background: #fafcfa; border-right: 1px solid #c5d5c5;">Class Teacher's Remark</td>
            <td style="width: 60%; padding: 4px 6px; font-style: italic;">${escapeHtml(result.teacherRecommendations)}</td>
            <td style="width: 25%; padding: 4px 6px; font-weight: bold; text-align: right; border-left: 1px solid #c5d5c5;">
              <div style="font-size: 7.5px; color: #555; text-transform: uppercase;">Teacher Name</div>
              <div style="font-size: 9.5px; color: ${primaryColor}; font-weight: bold; margin-top: 2px;">${escapeHtml(result.teacherName)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; font-weight: bold; color: ${primaryColor}; background: #fafcfa; border-right: 1px solid #c5d5c5;">Principal's Remark</td>
            <td style="padding: 4px 6px; font-style: italic;">${escapeHtml(result.headTeacherComments || 'A Remarkable and Excellent Result!!.. Keep it Up..')}</td>
            <td style="padding: 4px 6px; font-weight: bold; text-align: right; border-left: 1px solid #c5d5c5;">
              ${tenant.branding?.principalSignature ? `
                <img src="${tenant.branding.principalSignature}" style="max-height: 20px; object-fit: contain; display: block; margin-left: auto;" alt="Signature" />
              ` : `
                <div style="font-family: 'Times New Roman', 'Times', serif; font-size: 9.5px; font-style: italic; color: ${primaryColor}; line-height: 1; font-weight: bold;">Principal</div>
              `}
              <div style="font-size: 7.5px; color: #555; text-transform: uppercase; margin-top: 2px;">Principal Signature</div>
            </td>
          </tr>
        </table>

        <!-- Footer next term date -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding: 4px 10px; background: #fafcfa; border: 1px solid #c5d5c5; border-radius: 3px;">
          <div>
            <span style="font-weight: bold; color: #555; font-size: 8.5px; text-transform: uppercase;">Next Term Begins:</span>
            <span style="font-weight: bold; color: ${primaryColor}; margin-left: 6px; font-size: 9.5px;">${escapeHtml(result.nextTermBegins || 'Mon, 13-April-2026')}</span>
          </div>
          <div style="font-size: 8.5px; font-weight: bold; color: #555;">
            DATE: <span style="color: ${primaryColor};">${escapeHtml(result.dateIssued || new Date().toLocaleDateString('en-GB'))}</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 4px; font-size: 9px; color: #999; font-style: italic; letter-spacing: 0.5px; font-family: 'Inter', sans-serif;">
          ${schoolName.toUpperCase()} © 2026 - Powered by SmartSchool Africa
        </div>
      </div>
    </body>
    </html>
  `;
};

// Helper to generate the HTML string dynamically themed per tenant
const generateReportHtml = (result: any, student: any, tenant: any, classPositionString: string = '') => {
  if (tenant && tenant.slug === 'alqalam') {
    return generateAlQalamReportHtml(result, student, tenant, classPositionString);
  }
  if (tenant && tenant.curriculumType === 'conventional') {
    return generateConventionalReportHtml(result, student, tenant, classPositionString);
  }
  const primaryColor = tenant.branding?.primaryColor || '#1E5631';
  const secondaryColor = tenant.branding?.secondaryColor || '#d4af37';
  const logo = tenant.branding?.logo || SCHOOL_LOGO_BASE64;
  const schoolName = tenant.name || 'SmartSchool';
  const schoolNameArabic = tenant.nameArabic || '';
  const subHeader = tenant.subHeader || '';
  const address = tenant.contact?.address || '';
  const phoneNumbers = tenant.contact?.phoneNumbers || '';
  const email = tenant.contact?.email || '';

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
          <td class="center font-bold grade-cell" style="color: ${primaryColor};">${escapeHtml(sub.grade || 'F')}</td>
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
    if (average >= (tenant.academicConfig?.gradingScale?.A || 80)) grade = 'A';
    else if (average >= (tenant.academicConfig?.gradingScale?.B || 70)) grade = 'B';
    else if (average >= (tenant.academicConfig?.gradingScale?.C || 60)) grade = 'C';
    else if (average >= (tenant.academicConfig?.gradingScale?.D || 50)) grade = 'D';
    
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
        <td class="center ar font-bold" style="font-size: 13px; color: ${primaryColor};">${escapeHtml(el.rating || '')}</td>
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
          border: 3px solid ${primaryColor};
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
          border-bottom: 2.5px solid ${primaryColor};
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
          color: ${primaryColor};
          margin-bottom: 1px;
          font-weight: 700;
        }
        .header-text h2 {
          font-family: 'Times New Roman', 'Times', serif;
          font-size: 12.5px;
          color: #1a1a1a;
          margin-bottom: 1px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .header-text p.sub {
          font-family: 'Times New Roman', 'Times', serif;
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
          color: ${primaryColor};
          margin-left: 4px;
          font-size: 10px;
        }
        .muted {
          color: #bbb;
          font-size: 8.5px;
        }

        /* ── Section headers ── */
        .section-heading {
          background: ${primaryColor};
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
          color: ${primaryColor};
          font-size: 9px;
          font-weight: 700;
          margin-bottom: 2px;
          margin-top: 4px;
          padding-bottom: 1px;
          border-bottom: 1px solid ${secondaryColor};
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
          color: ${primaryColor};
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
          color: ${primaryColor};
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
          color: ${primaryColor};
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
          color: ${primaryColor};
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
          color: ${primaryColor};
        }
        .recommendation-text {
          font-family: 'Amiri', serif;
          font-size: 12px;
          color: ${primaryColor};
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
          color: ${primaryColor};
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
          border-top: 2px solid ${secondaryColor};
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
          color: ${primaryColor};
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
          color: ${primaryColor};
          font-style: italic;
        }
        .reco-text {
          font-family: 'Amiri', serif;
          font-size: 11.5px;
          color: ${primaryColor};
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
            <img src="${escapeHtml(student.picture)}" class="header-logo" style="width: 60px; height: 75px; object-fit: cover; border: 1.5px solid ${primaryColor};" alt="Student Passport" />
          ` : `
            <div style="width: 60px; height: 75px; border: 1.5px solid ${primaryColor}; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #fafafa; color: #888; font-size: 6px; text-align: center; padding: 2px; flex-shrink: 0;" class="header-logo">
              <span style="font-weight: bold; line-height: 1.1; font-size: 7px;">PASSPORT<br>PHOTO</span>
            </div>
          `}
          <div class="header-text">
            <h1>${escapeHtml(schoolNameArabic)}</h1>
            <h2>${escapeHtml(schoolName)}</h2>
            <p class="sub">${escapeHtml(subHeader)}</p>
            <p class="contact">${escapeHtml(address)} | Tel: ${escapeHtml(phoneNumbers)} | Email: ${escapeHtml(email)}</p>
          </div>
          <img src="${logo.startsWith('data:') ? logo : SCHOOL_LOGO_BASE64}" class="header-logo" alt="School Logo" />
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
            <tr style="background-color: #f4faf4; font-weight: bold; border-top: 1.5px solid ${primaryColor};">
              <td colspan="4" style="text-align: left; padding: 3px 5px;">
                <div class="bilingual-cell">
                  <span class="en" style="font-size: 8px;">Section Total Marks & Grade</span>
                  <span class="ar" style="font-size: 8px;">إجمالي درجات القسم والتقدير للمواد</span>
                </div>
              </td>
              <td class="center" style="color: ${primaryColor}; font-size: 9px; font-weight: 700;">${tahfeezhMetrics.total}</td>
              <td class="center grade-cell" style="color: ${primaryColor}; font-size: 10px; font-weight: 700;">${tahfeezhMetrics.grade}</td>
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
            <tr style="background-color: #f4faf4; font-weight: bold; border-top: 1.5px solid ${primaryColor};">
              <td colspan="4" style="text-align: left; padding: 3px 5px;">
                <div class="bilingual-cell">
                  <span class="en" style="font-size: 8px;">Section Total Marks & Grade</span>
                  <span class="ar" style="font-size: 8px;">إجمالي درجات القسم والتقدير للمواد</span>
                </div>
              </td>
              <td class="center" style="color: ${primaryColor}; font-size: 9px; font-weight: 700;">${islamicMetrics.total}</td>
              <td class="center grade-cell" style="color: ${primaryColor}; font-size: 10px; font-weight: 700;">${islamicMetrics.grade}</td>
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
            <tr style="background-color: #f4faf4; font-weight: bold; border-top: 1.5px solid ${primaryColor};">
              <td colspan="4" style="text-align: left; padding: 3px 5px;">
                <div class="bilingual-cell">
                  <span class="en" style="font-size: 8px;">Section Total Marks & Grade</span>
                  <span class="ar" style="font-size: 8px;">إجمالي درجات القسم والتقدير للمواد</span>
                </div>
              </td>
              <td class="center" style="color: ${primaryColor}; font-size: 9px; font-weight: 700;">${academicMetrics.total}</td>
              <td class="center grade-cell" style="color: ${primaryColor}; font-size: 10px; font-weight: 700;">${academicMetrics.grade}</td>
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
            <div class="total-val" style="color: ${primaryColor};">${escapeHtml(result.totalMark)}</div>
          </div>
          <div class="total-box">
            <div class="total-title bilingual-cell">
              <span class="en">Final Average</span>
              <span class="ar">المعدل النهائي</span>
            </div>
            <div class="total-val" style="color: ${primaryColor};">${escapeHtml(result.finalAverage)}%</div>
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
          <div class="bilingual-cell" style="font-weight: 700; color: ${primaryColor}; font-size: 8px; border-bottom: 1px solid #e8ede8; padding-bottom: 2px; margin-bottom: 3px;">
            <span class="en">Supervisor's Recommendations</span>
            <span class="ar">توصيات المشرف التربوي</span>
          </div>
          <div class="recommendation-text" style="font-family: 'Amiri', serif; font-size: 11.5px; color: ${primaryColor}; text-align: center; font-style: italic; min-height: 18px; line-height: 1.3; margin-top: 2px;">
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
              <div class="reco-text" style="color: ${primaryColor};">
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
              <div class="sign-text" style="color: ${primaryColor};">Approved Online</div>
            </div>
            <div class="footer-field" style="margin-top: 5px;">
              <span class="footer-label">Head Teacher's Comments & Sign:</span>
              <div class="reco-text" style="color: ${primaryColor};">
                ${escapeHtml(result.headTeacherComments || 'An Outstanding Performance. Keep it up.')}
              </div>
            </div>
          </div>
        </div>

        <div class="watermark" style="color: #c5d5c5;">An Outstanding Performance, Keep it up</div>

      </div>
    </body>
    </html>
  `;
};

// HTML statement template for Invoices
const generateInvoiceHtml = (invoice: any, student: any, tenant: any) => {
  const primaryColor = tenant.branding?.primaryColor || '#1E5631';
  const logo = tenant.branding?.logo || SCHOOL_LOGO_BASE64;
  const schoolName = tenant.name || 'SmartSchool';
  const schoolNameArabic = tenant.nameArabic || '';
  const address = tenant.contact?.address || '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice - ${escapeHtml(invoice.title)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; padding: 20px; color: #333; }
        .invoice-card { border: 2.5px solid ${primaryColor}; padding: 30px; border-radius: 8px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${primaryColor}; padding-bottom: 15px; margin-bottom: 20px; }
        .header img { width: 80px; }
        .header h1 { font-family: 'Cairo', sans-serif; font-size: 24px; color: ${primaryColor}; margin: 0; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .details-block h3 { color: ${primaryColor}; border-bottom: 1.5px solid #c5d5c5; padding-bottom: 5px; margin-bottom: 10px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .table th, .table td { border: 1px solid #c5d5c5; padding: 12px; text-align: left; }
        .table th { background: #eef4ee; color: ${primaryColor}; }
        .total-row { font-weight: bold; font-size: 16px; background: #fafcfa; }
        .footer-note { text-align: center; margin-top: 50px; font-size: 12px; color: #666; border-top: 1px dotted #c5d5c5; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <div class="header">
          <img src="${logo.startsWith('data:') ? logo : SCHOOL_LOGO_BASE64}" alt="Logo" />
          <div style="text-align: center;">
            <h1 style="font-size: 20px;">${escapeHtml(schoolNameArabic)}</h1>
            <h2 style="font-size: 18px; margin: 5px 0;">${escapeHtml(schoolName)}</h2>
            <p style="font-size: 10px; color: #666;">${escapeHtml(address)} | Financial Office Billing Statement</p>
          </div>
          <img src="${logo.startsWith('data:') ? logo : SCHOOL_LOGO_BASE64}" alt="Logo" />
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: ${primaryColor}; text-transform: uppercase; letter-spacing: 1px;">Academy Fee Invoice</h2>
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
            <p><b>Payment Status:</b> <span style="text-transform: uppercase; font-weight: bold; color: ${invoice.status === 'paid' ? primaryColor : invoice.status === 'partially_paid' ? '#d4af37' : '#d9534f'}">${invoice.status}</span></p>
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
              <td style="text-align: right; color: ${primaryColor};">₦${invoice.amount.toLocaleString()}</td>
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

        <div style="background: #fafcfa; border: 1px dashed ${primaryColor}; padding: 15px; border-radius: 4px; font-size: 12px; line-height: 1.6;">
          <h4 style="color: ${primaryColor}; margin-bottom: 5px;">Bank Transfer Settlement Instructions</h4>
          <p>Payments can be made directly via bank transfer to the school's bank account:</p>
          <p><b>Bank Name:</b> ${escapeHtml(tenant.academicConfig?.bankDetails?.bankName || 'N/A')}</p>
          <p><b>Account Name:</b> ${escapeHtml(tenant.academicConfig?.bankDetails?.accountName || 'N/A')}</p>
          <p><b>Account Number:</b> ${escapeHtml(tenant.academicConfig?.bankDetails?.accountNumber || 'N/A')}</p>
          <p>Please present the transfer receipt/reference code to the School Accounts Office for confirmation.</p>
        </div>

        <div class="footer-note">
          <p>Thank you for choosing ${escapeHtml(schoolName)}.</p>
          <p>This is a computer-generated billing statement issued by the Finance & Accounting Registry.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// HTML statement template for Receipts
const generateReceiptHtml = (invoice: any, student: any, payment: any, tenant: any) => {
  const primaryColor = tenant.branding?.primaryColor || '#1E5631';
  const logo = tenant.branding?.logo || SCHOOL_LOGO_BASE64;
  const schoolName = tenant.name || 'SmartSchool';
  const schoolNameArabic = tenant.nameArabic || '';
  const address = tenant.contact?.address || '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Receipt - Payment Confirmation</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; padding: 20px; color: #333; }
        .receipt-card { border: 2.5px solid ${primaryColor}; padding: 30px; border-radius: 8px; position: relative; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${primaryColor}; padding-bottom: 15px; margin-bottom: 20px; }
        .header img { width: 80px; }
        .header h1 { font-family: 'Cairo', sans-serif; font-size: 24px; color: ${primaryColor}; margin: 0; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .details-block h3 { color: ${primaryColor}; border-bottom: 1.5px solid #c5d5c5; padding-bottom: 5px; margin-bottom: 10px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .table th, .table td { border: 1px solid #c5d5c5; padding: 12px; text-align: left; }
        .table th { background: #eef4ee; color: ${primaryColor}; }
        .total-row { font-weight: bold; font-size: 16px; background: #fafcfa; }
        .footer-note { text-align: center; margin-top: 50px; font-size: 12px; color: #666; border-top: 1px dotted #c5d5c5; padding-top: 15px; }
        .paid-stamp { position: absolute; top: 120px; right: 50px; border: 3px solid ${primaryColor}; color: ${primaryColor}; text-transform: uppercase; font-size: 20px; font-weight: bold; padding: 10px 20px; border-radius: 4px; transform: rotate(-10deg); opacity: 0.8; }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="paid-stamp">Receipt Paid</div>
        
        <div class="header">
          <img src="${logo.startsWith('data:') ? logo : SCHOOL_LOGO_BASE64}" alt="Logo" />
          <div style="text-align: center;">
            <h1 style="font-size: 20px;">${escapeHtml(schoolNameArabic)}</h1>
            <h2 style="font-size: 18px; margin: 5px 0;">${escapeHtml(schoolName)}</h2>
            <p style="font-size: 10px; color: #666;">${escapeHtml(address)} | Financial Office Receipt Registry</p>
          </div>
          <img src="${logo.startsWith('data:') ? logo : SCHOOL_LOGO_BASE64}" alt="Logo" />
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: ${primaryColor}; text-transform: uppercase; letter-spacing: 1px;">Payment Receipt</h2>
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
              <td style="text-align: right; font-weight: bold; color: ${primaryColor};">₦${payment.amount.toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" style="text-align: right;">Total Amount Confirmed Paid:</td>
              <td style="text-align: right; color: ${primaryColor};">₦${payment.amount.toLocaleString()}</td>
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

// --- CONTROLLER HANDLERS FOR PDF GENERATION ---

export const generateResultPdf = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { id } = req.params;
    const result = await Result.findOne({ tenantId, _id: id });
    if (!result) {
      return res.status(404).json({ message: 'Result sheet not found' });
    }

    const student = await Student.findOne({ tenantId, _id: result.studentId, isDeleted: { $ne: true } });
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
      const teacher = await User.findOne({ tenantId, _id: req.user.id });
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

    const tenant = await Tenant.findById(tenantId);
    
    let classPositionString = '';
    if (tenant && tenant.slug === 'alqalam') {
      const allResultsInClass = await Result.find({
        tenantId,
        level: result.level,
        section: result.section,
        academicYear: result.academicYear,
        term: result.term
      }).sort({ finalAverage: -1 });

      const studentRankIndex = allResultsInClass.findIndex(r => r._id.toString() === result._id.toString());
      const classRank = studentRankIndex !== -1 ? studentRankIndex + 1 : 1;
      const classCount = allResultsInClass.length;

      const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      
      const rankSuffix = getOrdinal(classRank);
      let remark = 'FAIL';
      if (result.finalAverage >= 85) remark = 'EXCELLENT';
      else if (result.finalAverage >= 75) remark = 'VERY GOOD';
      else if (result.finalAverage >= 70) remark = 'GOOD';
      else if (result.finalAverage >= 65) remark = 'CREDIT';
      else if (result.finalAverage >= 60) remark = 'CREDIT';
      else if (result.finalAverage >= 50) remark = 'CREDIT';
      else if (result.finalAverage >= 45) remark = 'PASS';
      else if (result.finalAverage >= 40) remark = 'PASS';

      classPositionString = `${rankSuffix} of ${classCount} - ${remark}`;
    }

    const htmlContent = generateReportHtml(result, student, tenant, classPositionString);

    // Launch puppeteer
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

export const generateInvoicePdf = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { invoiceId } = req.params;
    const invoice = await Invoice.findOne({ tenantId, _id: invoiceId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user?.role === 'PARENT' && invoice.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to this invoice PDF' });
    }

    const student = await Student.findOne({ tenantId, _id: invoice.studentId, isDeleted: { $ne: true } });
    if (!student) {
      return res.status(404).json({ message: 'Student details not found' });
    }

    const tenant = await Tenant.findById(tenantId);
    const htmlContent = generateInvoiceHtml(invoice, student, tenant);

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
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const { invoiceId, paymentId } = req.params;
    const invoice = await Invoice.findOne({ tenantId, _id: invoiceId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user?.role === 'PARENT' && invoice.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to this receipt PDF' });
    }

    const student = await Student.findOne({ tenantId, _id: invoice.studentId, isDeleted: { $ne: true } });
    if (!student) {
      return res.status(404).json({ message: 'Student details not found' });
    }

    const payment = invoice.payments.find(p => p._id.toString() === paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    const tenant = await Tenant.findById(tenantId);
    const htmlContent = generateReceiptHtml(invoice, student, payment, tenant);

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
