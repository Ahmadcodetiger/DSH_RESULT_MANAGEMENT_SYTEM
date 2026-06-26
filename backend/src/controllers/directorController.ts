import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import User from '../models/User';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import Result from '../models/Result';
import Notification from '../models/Notification';
import Settings from '../models/Settings';

export const getExecutiveOverview = async (req: AuthRequest, res: Response) => {
  try {
    const { term, academicYear } = req.query;
    const settings = await Settings.findOne({ key: 'school_info' });
    const filterTerm = (term as string) || settings?.currentTerm || 'First Term';
    const filterYear = (academicYear as string) || settings?.currentAcademicYear || '2025/2026';

    // 1. Core Counts
    const activeStudentsCount = await Student.countDocuments({ isDeleted: { $ne: true } });
    const teachersCount = await User.countDocuments({ role: 'TEACHER' });

    const activeStudents = await Student.find({ isDeleted: { $ne: true }, academicYear: filterYear });
    const totalInvoiced = activeStudents.reduce((sum, s: any) => sum + (s.schoolFees || 0), 0);

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

    // 3. School Average Score
    const results = await Result.find({ term: filterTerm, academicYear: filterYear });
    let totalGPA = 0;
    results.forEach((r) => {
      totalGPA += r.finalAverage;
    });
    const averageScore = results.length > 0 ? Math.round(totalGPA / results.length) : 0;

    // 4. Pending Results approvals list
    const pendingResults = await Result.find({ 
      status: { $ne: 'approved' },
      term: filterTerm,
      academicYear: filterYear
    }).populate('studentId');

    // 5. Recent notifications mapped to audit logs
    const notifications = await Notification.find({}).sort({ createdAt: -1 }).limit(5);
    const recentLogs = notifications.map((n) => ({
      user: n.createdBy,
      action: `Sent broadcast notification: "${n.title}"`,
      timestamp: n.createdAt,
    }));

    return res.status(200).json({
      counts: {
        students: activeStudentsCount,
        teachers: teachersCount,
      },
      averageScore,
      financials: {
        totalBillings: totalInvoiced,
        totalPaid,
        totalExpenses,
      },
      pendingResults,
      recentLogs,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error retrieving executive overview', error: error.message });
  }
};

