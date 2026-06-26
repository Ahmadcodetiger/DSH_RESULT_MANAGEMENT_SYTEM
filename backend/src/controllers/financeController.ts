import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import Student from '../models/Student';

// Create fee invoices (specific student or level-wide batch)
export const createInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, level, title, amount, dueDate } = req.body;

    if (!title || !amount || !dueDate) {
      return res.status(400).json({ message: 'Missing required billing fields' });
    }

    const due = new Date(dueDate);

    if (studentId) {
      const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } });
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const invoice = new Invoice({
        studentId,
        title,
        amount,
        dueDate: due,
      });
      await invoice.save();
      return res.status(201).json({ message: 'Invoice created successfully', invoice });
    } else if (level) {
      // Batch billing for entire level
      const students = await Student.find({ level, isDeleted: { $ne: true } });
      if (students.length === 0) {
        return res.status(404).json({ message: 'No students found in this level to bill' });
      }

      const invoicesToInsert = students.map((s) => ({
        studentId: s._id,
        title,
        amount,
        dueDate: due,
      }));

      const result = await Invoice.insertMany(invoicesToInsert);
      return res.status(201).json({ message: `Invoiced ${result.length} students successfully.` });
    } else {
      return res.status(400).json({ message: 'Either Student ID or Level must be specified' });
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Record payment against an invoice
export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const { amount, method, transactionRef } = req.body;

    if (!amount || !method) {
      return res.status(400).json({ message: 'Amount and payment method are required' });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Add payment entry
    invoice.payments.push({
      amount: Number(amount),
      date: new Date(),
      method,
      transactionRef: transactionRef || '',
    });

    invoice.paidAmount += Number(amount);

    // Update status
    if (invoice.paidAmount >= invoice.amount) {
      invoice.status = 'paid';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partially_paid';
    } else {
      invoice.status = 'unpaid';
    }

    await invoice.save();
    return res.status(200).json({ message: 'Payment recorded successfully', invoice });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Invoices list (Paginated + Filterable)
export const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, status, page, limit } = req.query;
    const filter: any = {};

    if (studentId) filter.studentId = studentId;
    if (status) filter.status = status;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skipNum = (pageNum - 1) * limitNum;

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('studentId', 'name admissionNumber level section')
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    return res.status(200).json({
      invoices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Record expenditure
export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { title, amount, category, date, description } = req.body;

    if (!title || !amount || !category) {
      return res.status(400).json({ message: 'Missing required expense fields' });
    }

    const expense = new Expense({
      title,
      amount: Number(amount),
      category,
      date: date ? new Date(date) : new Date(),
      description: description || '',
    });

    await expense.save();
    return res.status(201).json({ message: 'Expense recorded successfully', expense });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// List school expenses (Paginated)
export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skipNum = (pageNum - 1) * limitNum;

    const total = await Expense.countDocuments({});
    const expenses = await Expense.find({})
      .sort({ date: -1 })
      .skip(skipNum)
      .limit(limitNum);

    return res.status(200).json({
      expenses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Financial Statistics Summary
export const getFinanceSummary = async (req: AuthRequest, res: Response) => {
  try {
    const activeStudents = await Student.find({ isDeleted: { $ne: true } });
    const totalInvoiced = activeStudents.reduce((sum, s: any) => sum + (s.schoolFees || 0), 0);

    const invoices = await Invoice.find({});
    let totalPaid = 0;

    invoices.forEach((inv) => {
      totalPaid += inv.paidAmount;
    });

    const totalOutstanding = totalInvoiced - totalPaid;

    const expenses = await Expense.find({});
    let totalExpenses = 0;
    const categoryBreakdown: { [key: string]: number } = {
      salary: 0,
      utility: 0,
      maintenance: 0,
      books: 0,
      other: 0,
    };

    expenses.forEach((exp) => {
      totalExpenses += exp.amount;
      if (categoryBreakdown[exp.category] !== undefined) {
        categoryBreakdown[exp.category] += exp.amount;
      } else {
        categoryBreakdown.other += exp.amount;
      }
    });

    const netBalance = totalPaid - totalExpenses;

    return res.status(200).json({
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      totalExpenses,
      netBalance,
      categoryBreakdown,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
