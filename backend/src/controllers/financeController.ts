import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import Student from '../models/Student';
import Settings from '../models/Settings';
import User from '../models/User';
import Salary from '../models/Salary';

// Create fee invoices (specific student or level-wide batch)
export const createInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, level, section, amount, dueDate, term, academicYear } = req.body;
    const title = req.body.title || req.body.description;

    if (!title || !amount || !dueDate) {
      return res.status(400).json({ message: 'Missing required billing fields' });
    }

    const due = new Date(dueDate);

    // Fetch school settings to use as defaults
    let settings = await Settings.findOne({ key: 'school_info' });
    const invoiceTerm = term || settings?.currentTerm || 'First Term';
    const invoiceYear = academicYear || settings?.currentAcademicYear || '2025/2026';

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
        term: invoiceTerm,
        academicYear: invoiceYear,
      });
      await invoice.save();
      
      const invoiceObj = invoice.toObject() as any;
      const mappedInvoice = {
        ...invoiceObj,
        description: invoiceObj.description || invoiceObj.title,
        status: (invoiceObj.status || 'unpaid').toUpperCase(),
      };
      
      return res.status(201).json({ message: 'Invoice created successfully', invoice: mappedInvoice });
    } else if (level) {
      // Batch billing for level (with optional section)
      const query: any = { level, isDeleted: { $ne: true } };
      if (section) {
        query.section = section;
      }
      const students = await Student.find(query);
      if (students.length === 0) {
        return res.status(404).json({ message: 'No students found in this category to bill' });
      }

      const invoicesToInsert = students.map((s) => ({
        studentId: s._id,
        title,
        amount,
        dueDate: due,
        term: invoiceTerm,
        academicYear: invoiceYear,
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
    const { amount } = req.body;
    const method = req.body.method || (req.body.reference ? 'bank_transfer' : 'cash');
    const transactionRef = req.body.transactionRef || req.body.reference || '';

    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
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

    const invoiceObj = invoice.toObject() as any;
    const mappedInvoice = {
      ...invoiceObj,
      description: invoiceObj.description || invoiceObj.title,
      status: (invoiceObj.status || 'unpaid').toUpperCase(),
    };

    return res.status(200).json({ message: 'Payment recorded successfully', invoice: mappedInvoice });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Invoices list (Paginated + Filterable)
export const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, status, page, limit, term, academicYear } = req.query;
    const filter: any = {};

    if (req.user?.role === 'PARENT') {
      filter.studentId = req.user.id;
    } else if (studentId) {
      filter.studentId = studentId;
    }
    if (status) {
      filter.status = String(status).toLowerCase();
    }

    // Fetch active settings to determine default term and academic year if not provided in query
    let settings = await Settings.findOne({ key: 'school_info' });
    const queryTerm = (term as string) || settings?.currentTerm || 'First Term';
    const queryYear = (academicYear as string) || settings?.currentAcademicYear || '2025/2026';

    filter.term = queryTerm;
    filter.academicYear = queryYear;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skipNum = (pageNum - 1) * limitNum;

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('studentId', 'name admissionNumber level section')
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    const mappedInvoices = invoices.map((inv) => {
      const obj = inv.toObject() as any;
      return {
        ...obj,
        description: obj.description || obj.title,
        status: (obj.status || 'unpaid').toUpperCase(),
      };
    });

    return res.status(200).json({
      invoices: mappedInvoices,
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
    const { amount, category, date, description, term, academicYear } = req.body;
    const title = req.body.title || req.body.description || req.body.category || 'Expense';

    if (!title || !amount || !category) {
      return res.status(400).json({ message: 'Missing required expense fields' });
    }

    // Fetch settings for default term and year fallbacks
    let settings = await Settings.findOne({ key: 'school_info' });
    const expenseTerm = term || settings?.currentTerm || 'First Term';
    const expenseYear = academicYear || settings?.currentAcademicYear || '2025/2026';

    const categoryMap: { [key: string]: string } = {
      'salaries': 'salary',
      'salary': 'salary',
      'utilities': 'utility',
      'utility': 'utility',
      'maintenance': 'maintenance',
      'materials': 'books',
      'books': 'books',
      'rent': 'other',
      'other': 'other'
    };
    const catKey = String(category).toLowerCase();
    const mappedCategory = categoryMap[catKey] || 'other';

    const expense = new Expense({
      title,
      amount: Number(amount),
      category: mappedCategory,
      date: date ? new Date(date) : new Date(),
      description: description || '',
      term: expenseTerm,
      academicYear: expenseYear,
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
    const { page, limit, term, academicYear } = req.query;

    let settings = await Settings.findOne({ key: 'school_info' });
    const queryTerm = (term as string) || settings?.currentTerm || 'First Term';
    const queryYear = (academicYear as string) || settings?.currentAcademicYear || '2025/2026';

    const filter: any = {
      term: queryTerm,
      academicYear: queryYear
    };

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skipNum = (pageNum - 1) * limitNum;

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
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
    const { term, academicYear } = req.query;

    let settings = await Settings.findOne({ key: 'school_info' });
    const filterTerm = (term as string) || settings?.currentTerm || 'First Term';
    const filterYear = (academicYear as string) || settings?.currentAcademicYear || '2025/2026';

    // Calculate dynamic expected money based on students admitted in the selected academic year
    const activeStudents = await Student.find({ isDeleted: { $ne: true }, academicYear: filterYear });
    const totalInvoiced = activeStudents.reduce((sum, s: any) => sum + (s.schoolFees || 0), 0);

    const invoices = await Invoice.find({ term: filterTerm, academicYear: filterYear });
    let totalPaid = 0;

    invoices.forEach((inv) => {
      totalPaid += inv.paidAmount;
    });

    const totalOutstanding = totalInvoiced - totalPaid;

    const expenses = await Expense.find({ term: filterTerm, academicYear: filterYear });
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

// Fetch all staff users (non-parents)
export const getStaffList = async (req: AuthRequest, res: Response) => {
  try {
    const staff = await User.find({ role: { $ne: 'PARENT' } }).select('-password');
    return res.status(200).json(staff);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching staff list', error: error.message });
  }
};

// Record a salary payment
export const paySalary = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId, month, year, amount, transactionReference } = req.body;

    if (!staffId || !month || !year || !amount) {
      return res.status(400).json({ message: 'Missing required salary payment fields' });
    }

    // Check if salary payment already recorded for the same month & year to prevent duplicates
    const existingPayment = await Salary.findOne({ staffId, month, year });
    if (existingPayment) {
      return res.status(400).json({ message: `Salary payment for ${month} ${year} has already been recorded for this staff member.` });
    }

    const salary = new Salary({
      staffId,
      month,
      year,
      amount: Number(amount),
      transactionReference: transactionReference || '',
      status: 'paid',
      paymentDate: new Date(),
    });

    await salary.save();
    
    // Also record this as a school expense under Category "salary" automatically!
    const staffUser = await User.findById(staffId);
    const staffName = staffUser ? staffUser.name : 'Staff';
    
    // Fetch settings for default term and year fallbacks
    let settings = await Settings.findOne({ key: 'school_info' });
    const currentTerm = settings?.currentTerm || 'First Term';
    const currentYear = settings?.currentAcademicYear || '2025/2026';

    const expense = new Expense({
      title: `Salary Payment - ${staffName}`,
      amount: Number(amount),
      category: 'salary',
      date: new Date(),
      description: `Salary paid to ${staffName} for ${month} ${year}. Ref: ${transactionReference || 'N/A'}`,
      term: currentTerm,
      academicYear: currentYear,
    });
    await expense.save();

    return res.status(201).json({ message: 'Salary payment recorded and logged as expense successfully', salary });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error recording salary payment', error: error.message });
  }
};

// Fetch all salary payments (Admin / Accountant / Director)
export const getSalaries = async (req: AuthRequest, res: Response) => {
  try {
    const { year } = req.query;
    const filter: any = {};
    if (year) filter.year = String(year);

    const salaries = await Salary.find(filter).populate('staffId', 'name username role');
    return res.status(200).json(salaries);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching salary payments', error: error.message });
  }
};

// Fetch my salary payments (Staff view)
export const getMySalaries = async (req: AuthRequest, res: Response) => {
  try {
    const staffId = req.user?.id;
    if (!staffId) return res.status(401).json({ message: 'Unauthorized' });

    const salaries = await Salary.find({ staffId }).sort({ paymentDate: -1 });
    return res.status(200).json(salaries);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching personal salary payments', error: error.message });
  }
};

// Parent Portal: Fetch all invoices for the parent's child along with payment info
export const getParentInvoices = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'PARENT') {
      return res.status(403).json({ message: 'Access denied: parent only' });
    }

    // Find the student by admission number (same pattern as getParentStudentResults)
    const student = await Student.findOne({
      admissionNumber: req.user.admissionNumber,
      isDeleted: { $ne: true },
    });
    if (!student) {
      return res.status(404).json({ message: 'Student details not found' });
    }

    // Optional term/year filtering from query params
    const { term, academicYear } = req.query;
    const filter: any = { studentId: student._id };
    if (term) filter.term = String(term);
    if (academicYear) filter.academicYear = String(academicYear);

    const invoices = await Invoice.find(filter)
      .populate('studentId', 'name admissionNumber level section')
      .sort({ createdAt: -1 });

    const mappedInvoices = invoices.map((inv) => {
      const obj = inv.toObject() as any;
      return {
        ...obj,
        description: obj.description || obj.title,
        status: (obj.status || 'unpaid').toUpperCase(),
      };
    });

    // Fetch school settings for bank payment details and accountant WhatsApp
    let settings = await Settings.findOne({ key: 'school_info' });

    return res.status(200).json({
      invoices: mappedInvoices,
      paymentInfo: {
        bankName: settings?.bankName || '',
        accountName: settings?.accountName || '',
        accountNumber: settings?.accountNumber || '',
        accountantWhatsApp: (settings as any)?.accountantWhatsApp || '',
        schoolPhone: settings?.phoneNumbers || '',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching parent invoices', error: error.message });
  }
};
