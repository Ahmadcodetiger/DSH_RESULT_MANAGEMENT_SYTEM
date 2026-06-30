import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dns from 'dns';
import { promisify } from 'util';
import { AuthRequest } from '../middleware/auth';
import { TenantRequest } from '../middleware/tenantResolver';
import Tenant from '../models/Tenant';
import User from '../models/User';
import Subscription from '../models/Subscription';
import Plan from '../models/Plan';
import AuditLog from '../models/AuditLog';
import Student from '../models/Student';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL ERROR: JWT_SECRET environment variable is not defined.');
  }
  return secret;
};

/**
 * Register a new school (tenant) — Self-service onboarding
 * 
 * Creates: Tenant record, Admin user, Subscription, and returns JWT token.
 */
export const registerSchool = async (req: TenantRequest, res: Response) => {
  try {
    const {
      schoolName,
      schoolNameArabic,
      slug,
      adminUsername,
      adminPassword,
      adminName,
      adminEmail,
      address,
      phoneNumbers,
      planId,
      curriculumType,
    } = req.body;

    // Validate required fields
    if (!schoolName || !slug || !adminUsername || !adminPassword || !adminName) {
      return res.status(400).json({
        message: 'Missing required fields: schoolName, slug, adminUsername, adminPassword, adminName',
      });
    }

    if (adminPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    const normalizedSlug = slug.toLowerCase().trim();
    if (!slugRegex.test(normalizedSlug)) {
      return res.status(400).json({
        message: 'Invalid slug. Use only lowercase letters, numbers, and hyphens.',
      });
    }

    // Check reserved slugs
    const reservedSlugs = ['www', 'api', 'admin', 'app', 'mail', 'platform', 'support', 'help', 'docs', 'blog', 'status'];
    if (reservedSlugs.includes(normalizedSlug)) {
      return res.status(400).json({ message: 'This school URL is reserved. Please choose a different one.' });
    }

    // Check if slug is already taken
    const existingTenant = await Tenant.findOne({ slug: normalizedSlug });
    if (existingTenant) {
      return res.status(400).json({ message: 'This school URL is already taken. Please choose a different one.' });
    }

    // Look up selected plan (default to starter)
    const selectedPlanId = planId || 'starter';
    const plan = await Plan.findOne({ planId: selectedPlanId, isActive: true });

    // Create tenant
    const tenant = new Tenant({
      slug: normalizedSlug,
      name: schoolName.trim(),
      nameArabic: (schoolNameArabic || '').trim(),
      status: 'trial',
      domains: {
        subdomain: normalizedSlug,
        customDomain: '',
      },
      contact: {
        address: address || '',
        phoneNumbers: phoneNumbers || '',
        email: adminEmail || '',
      },
      academicConfig: {
        currentAcademicYear: '2025/2026',
        currentTerm: 'First Term',
      },
      subscription: {
        planId: selectedPlanId,
        status: 'trial',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxStudents: plan?.limits.maxStudents || 200,
        maxTeachers: plan?.limits.maxTeachers || 15,
        maxAdmins: plan?.limits.maxAdmins || 2,
        maxStorageMB: plan?.limits.maxStorageMB || 500,
        maxAiCallsPerMonth: plan?.limits.maxAiCallsPerMonth || 100,
      },
      features: plan?.features || {},
      curriculumType: curriculumType || 'dual',
      landingPage: {
        heroTitle: `Welcome to ${schoolName}`,
      },
    });

    await tenant.save();

    // Create admin user for this tenant
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const adminUser = new User({
      tenantId: tenant._id,
      username: adminUsername.trim().toLowerCase(),
      password: hashedPassword,
      name: adminName.trim(),
      role: 'ADMIN',
    });

    await adminUser.save();

    // Create subscription record
    const subscription = new Subscription({
      tenantId: tenant._id,
      planId: selectedPlanId,
      status: 'trial',
      amount: plan?.priceMonthly || 20000,
      currency: 'NGN',
      billingCycle: 'monthly',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    await subscription.save();

    // Log the registration
    await AuditLog.create({
      tenantId: tenant._id,
      userId: adminUser._id,
      userName: adminUser.name,
      userRole: 'ADMIN',
      action: 'SCHOOL_REGISTERED',
      resource: 'Tenant',
      resourceId: tenant._id,
      description: `School "${schoolName}" registered with slug "${normalizedSlug}"`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    // Generate JWT token so the admin is logged in immediately
    const token = jwt.sign(
      {
        id: adminUser._id,
        role: adminUser.role,
        tenantId: tenant._id.toString(),
        name: adminUser.name,
      },
      getJwtSecret(),
      { expiresIn: '2h' }
    );

    return res.status(201).json({
      message: 'School registered successfully! Your 14-day free trial has started.',
      token,
      tenant: {
        id: tenant._id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        portalUrl: `${tenant.slug}.smartschool.africa`,
        trialEndsAt: tenant.subscription.trialEndsAt,
      },
      user: {
        id: adminUser._id,
        username: adminUser.username,
        name: adminUser.name,
        role: adminUser.role,
      },
    });
  } catch (error: any) {
    console.error('School registration error:', error);
    let message = 'Server error during registration';
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {}).join(', ');
      message = `Registration duplicate conflict on field: [${field}]. Please try another name, slug, or login credentials.`;
    } else if (error.message) {
      message = error.message;
    }
    return res.status(500).json({ message, error: error.message });
  }
};

/**
 * Get current tenant details (for authenticated admin users)
 */
export const getTenantDetails = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'School not found' });
    }

    return res.status(200).json(tenant);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update tenant settings (school info, branding, academic config)
 */
export const updateTenantSettings = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'School not found' });
    }

    const {
      name, nameArabic, subHeader,
      branding, contact, landingPage, academicConfig,
    } = req.body;

    // Update top-level fields
    if (name !== undefined) tenant.name = name;
    if (nameArabic !== undefined) tenant.nameArabic = nameArabic;
    if (subHeader !== undefined) tenant.subHeader = subHeader;

    // Deep merge branding
    if (branding) {
      Object.assign(tenant.branding, branding);
    }

    // Deep merge contact
    if (contact) {
      if (contact.socialMedia) {
        Object.assign(tenant.contact.socialMedia, contact.socialMedia);
        delete contact.socialMedia;
      }
      Object.assign(tenant.contact, contact);
    }

    // Deep merge landing page
    if (landingPage) {
      Object.assign(tenant.landingPage, landingPage);
    }

    // Deep merge academic config
    if (academicConfig) {
      if (academicConfig.gradingScale) {
        Object.assign(tenant.academicConfig.gradingScale, academicConfig.gradingScale);
        delete academicConfig.gradingScale;
      }
      if (academicConfig.bankDetails) {
        Object.assign(tenant.academicConfig.bankDetails, academicConfig.bankDetails);
        delete academicConfig.bankDetails;
      }
      Object.assign(tenant.academicConfig, academicConfig);
    }

    await tenant.save();

    // Audit log
    await AuditLog.create({
      tenantId: tenant._id,
      userId: req.user?.id,
      userName: req.user?.name || 'Unknown',
      userRole: req.user?.role || '',
      action: 'SETTINGS_UPDATED',
      resource: 'Tenant',
      resourceId: tenant._id,
      description: 'School settings updated',
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({ message: 'Settings updated successfully', tenant });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get the tenant's public landing page data (no auth required)
 */
export const getTenantLandingPage = async (req: TenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(404).json({ message: 'School not found' });
    }

    const tenant = req.tenant;

    return res.status(200).json({
      name: tenant.name,
      nameArabic: tenant.nameArabic,
      subHeader: tenant.subHeader,
      branding: tenant.branding,
      contact: tenant.contact,
      landingPage: tenant.landingPage,
      status: tenant.status,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Check if a slug is available
 */
export const checkSlugAvailability = async (req: TenantRequest, res: Response) => {
  try {
    const { slug } = req.query;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ message: 'slug query parameter is required' });
    }

    const normalizedSlug = slug.toLowerCase().trim();
    const existing = await Tenant.findOne({ slug: normalizedSlug });
    const reservedSlugs = ['www', 'api', 'admin', 'app', 'mail', 'platform', 'support', 'help', 'docs', 'blog', 'status'];

    return res.status(200).json({
      slug: normalizedSlug,
      available: !existing && !reservedSlugs.includes(normalizedSlug),
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get available plans (public)
 */
export const getAvailablePlans = async (req: TenantRequest, res: Response) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });
    return res.status(200).json(plans);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const dnsResolveCname = promisify(dns.resolveCname);
const dnsResolve4 = promisify(dns.resolve4);

/**
 * Serves dynamic CSS variables for white-labeling
 */
export const getTenantThemeCss = async (req: TenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      res.setHeader('Content-Type', 'text/css');
      return res.status(404).send('/* Tenant context not found */');
    }

    const branding = req.tenant.branding;
    const primary = branding?.primaryColor || '#1a7a4c';
    const secondary = branding?.secondaryColor || '#f0c14b';
    const logoUrl = branding?.logo || '';
    const faviconUrl = branding?.favicon || '';

    const css = `/**
 * SmartSchool Africa - Dynamic Tenant Theme Stylesheet
 * School: ${req.tenant.name}
 * Slug: ${req.tenant.slug}
 */

:root {
  --tenant-primary-color: ${primary};
  --tenant-secondary-color: ${secondary};
  --tenant-logo-url: ${logoUrl ? `url('${logoUrl}')` : 'none'};
  --tenant-favicon-url: ${faviconUrl ? `url('${faviconUrl}')` : 'none'};
}
`;

    res.setHeader('Content-Type', 'text/css');
    return res.status(200).send(css);
  } catch (error: any) {
    res.setHeader('Content-Type', 'text/css');
    return res.status(500).send('/* Internal server error generating dynamic theme stylesheet */');
  }
};

/**
 * Verifies DNS configuration for custom domain mapping (Enterprise tier)
 */
export const verifyCustomDomain = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'School profile not found' });
    }

    const customDomain = req.body.customDomain || tenant.domains.customDomain;
    if (!customDomain) {
      return res.status(400).json({ message: 'Custom domain is not configured or provided.' });
    }

    const cleanDomain = customDomain.toLowerCase().trim().replace(/^https?:\/\//, '');

    // Prevent domain hijacking / duplicate registration
    const duplicateDomain = await Tenant.findOne({
      _id: { $ne: tenant._id },
      'domains.customDomain': cleanDomain
    });
    if (duplicateDomain) {
      return res.status(409).json({ message: 'This custom domain is already claimed by another school profile.' });
    }

    const expectedCname = process.env.PLATFORM_PROXY_TARGET || 'proxy.smartschool.africa';
    let isCnameValid = false;
    let actualResolvedTarget = '';
    let cnameError = '';

    // 1. Try to resolve CNAME
    try {
      const records = await dnsResolveCname(cleanDomain);
      actualResolvedTarget = records[0];
      if (actualResolvedTarget.toLowerCase().endsWith(expectedCname.toLowerCase())) {
        isCnameValid = true;
      }
    } catch (err: any) {
      cnameError = err.message;
    }

    // 2. Try to resolve A records as fallback (if PLATFORM_PROXY_IP is defined)
    const expectedIp = process.env.PLATFORM_PROXY_IP;
    let isIpValid = false;
    let resolvedIps: string[] = [];
    let ipError = '';

    if (expectedIp) {
      try {
        resolvedIps = await dnsResolve4(cleanDomain);
        if (resolvedIps.includes(expectedIp)) {
          isIpValid = true;
        }
      } catch (err: any) {
        ipError = err.message;
      }
    }

    const isVerified = isCnameValid || isIpValid;

    // Save state
    tenant.domains.customDomain = cleanDomain;
    tenant.domains.customDomainVerified = isVerified;
    tenant.domains.customDomainStatus = isVerified ? 'active' : 'pending';
    await tenant.save();

    // Log in audit log
    await AuditLog.create({
      tenantId: tenant._id,
      userId: req.user?.id || null,
      userName: req.user?.name || 'System',
      userRole: req.user?.role || 'SYSTEM',
      action: 'DOMAIN_VERIFICATION_CHECK',
      resource: 'Tenant',
      resourceId: tenant._id,
      description: `Custom domain ${cleanDomain} verification checked. Result: ${isVerified ? 'VERIFIED' : 'PENDING'}`,
      changes: { before: { customDomainVerified: !isVerified }, after: { customDomainVerified: isVerified } },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({
      verified: isVerified,
      customDomain: cleanDomain,
      expectedCNAME: expectedCname,
      actualCNAME: actualResolvedTarget || 'None',
      expectedIP: expectedIp || 'Not configured',
      resolvedIPs: resolvedIps,
      errors: {
        cnameError,
        ipError,
      },
    });
  } catch (error: any) {
    console.error('verifyCustomDomain error:', error);
    return res.status(500).json({ message: 'Domain verification failed', error: error.message });
  }
};

/**
 * GET /api/platform/admin/dashboard
 * Retrieves global platform metrics for SaaS operators (Super Admins only).
 */
export const getPlatformAdminDashboard = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Gather all tenants
    const tenants = await Tenant.find({});
    
    let totalMRR = 0;
    let activeSubscriptions = 0;
    const schoolsList: any[] = [];

    for (const tenant of tenants) {
      // Find subscription details
      const sub = await Subscription.findOne({ tenantId: tenant._id });
      
      // Count total students registered under this tenant
      const studentCount = await Student.countDocuments({ tenantId: tenant._id, isDeleted: { $ne: true } });

      let planName = 'Free Trial';
      let planId = 'trial';
      let billingCycle = 'monthly';
      let cost = 0;

      if (sub) {
        planId = sub.planId;
        billingCycle = sub.billingCycle;
        
        if (sub.status === 'active') {
          activeSubscriptions++;
          
          if (planId === 'starter') {
            cost = billingCycle === 'yearly' ? Math.round(200000 / 12) : 20000;
            planName = 'Starter';
          } else if (planId === 'professional') {
            cost = billingCycle === 'yearly' ? Math.round(500000 / 12) : 50000;
            planName = 'Professional';
          } else if (planId === 'enterprise') {
            cost = billingCycle === 'yearly' ? Math.round(1000000 / 12) : 100000;
            planName = 'Enterprise';
          }
          
          totalMRR += cost;
        } else if (sub.status === 'trial') {
          planName = 'Free Trial';
        } else {
          planName = `Suspended (${sub.status})`;
        }
      }

      schoolsList.push({
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        planName,
        planId,
        billingCycle,
        studentCount,
        status: tenant.status,
        customDomain: tenant.domains?.customDomain || 'Not configured',
        createdAt: tenant.createdAt
      });
    }

    return res.status(200).json({
      metrics: {
        totalSchools: tenants.length,
        activeSubscriptions,
        mrr: totalMRR,
        totalStudentsAllTime: schoolsList.reduce((sum, s) => sum + s.studentCount, 0)
      },
      schools: schoolsList
    });
  } catch (error: any) {
    console.error('getPlatformAdminDashboard error:', error);
    return res.status(500).json({ message: 'Failed to retrieve platform dashboard insights', error: error.message });
  }
};
