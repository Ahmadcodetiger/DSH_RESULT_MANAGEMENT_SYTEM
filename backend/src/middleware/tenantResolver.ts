import { Request, Response, NextFunction } from 'express';
import Tenant, { ITenant } from '../models/Tenant';

/**
 * Extended request interface that carries tenant context.
 * All downstream middleware and controllers can access req.tenantId and req.tenant.
 */
export interface TenantRequest extends Request {
  tenantId?: string;
  tenant?: ITenant;
}

/**
 * Cache tenant lookups in memory for 5 minutes to avoid hitting
 * the database on every single request. In production, replace
 * with Redis or a proper cache layer.
 */
const tenantCache = new Map<string, { tenant: ITenant; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedTenant(key: string): ITenant | null {
  const entry = tenantCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tenantCache.delete(key);
    return null;
  }
  return entry.tenant;
}

function setCachedTenant(key: string, tenant: ITenant): void {
  tenantCache.set(key, { tenant, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Extracts the tenant slug from the subdomain.
 * 
 * Examples:
 *   darulhikmah.smartschool.africa → "darulhikmah"
 *   greenfield.smartschool.africa → "greenfield"
 *   localhost:5000 → null (no subdomain)
 *   smartschool.africa → null (apex domain)
 */
function extractSubdomain(host: string): string | null {
  // Strip port if present
  const hostname = host.split(':')[0];

  // Skip if localhost, IP address, or Vercel deployment domains
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.endsWith('.vercel.app')) {
    return null;
  }

  const parts = hostname.split('.');

  // Expect at least 3 parts for a subdomain: sub.domain.tld
  // For .africa TLD: sub.smartschool.africa (3 parts)
  // For .com.ng: sub.smartschool.com.ng (4 parts)
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Skip 'www', 'api', 'admin' — these are infrastructure subdomains
    const reservedSubdomains = ['www', 'api', 'admin', 'app', 'mail', 'smtp', 'ftp', 'cdn', 'platform'];
    if (reservedSubdomains.includes(subdomain)) {
      return null;
    }
    return subdomain;
  }

  return null;
}

/**
 * Tenant Resolver Middleware
 * 
 * Resolution priority:
 * 1. X-Tenant-ID header (for API clients, testing, and mobile apps)
 * 2. Subdomain: darulhikmah.smartschool.africa
 * 3. Custom domain: portal.darulhikmah.edu.ng (via domains.customDomain lookup)
 * 
 * If no tenant can be resolved, the request continues WITHOUT tenant context
 * (for platform-level routes like super-admin panel, health check, etc.)
 */
export const resolveTenant = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    let tenant: ITenant | null = null;

    // 1. Check X-Tenant-ID header first (highest priority).
    // For safety, falling back to query parameter is DISABLED by default.
    // To allow tenant resolution via query param (e.g., special download links)
    // set `ALLOW_TENANT_QUERY=true` in the environment. This prevents
    // accidental tenant switching via crafted URLs.
    let tenantHeader = req.headers['x-tenant-id'] as string;
    if (!tenantHeader && process.env.ALLOW_TENANT_QUERY === 'true' && (req.query.tenantId || req.query.tenant)) {
      tenantHeader = (req.query.tenantId || req.query.tenant) as string;
    }
    if (tenantHeader) {
      // Could be a slug or an ObjectId
      const cacheKey = `header:${tenantHeader}`;
      tenant = getCachedTenant(cacheKey);
      if (!tenant) {
        tenant = await Tenant.findOne({
          $or: [
            { slug: tenantHeader.toLowerCase() },
            { _id: tenantHeader.match(/^[0-9a-fA-F]{24}$/) ? tenantHeader : undefined },
          ].filter(q => Object.values(q!)[0] !== undefined),
        });
        if (tenant) setCachedTenant(cacheKey, tenant);
      }
    }

    // 2. Check subdomain
    if (!tenant) {
      const host = req.headers.host || '';
      const subdomain = extractSubdomain(host);
      if (subdomain) {
        const cacheKey = `sub:${subdomain}`;
        tenant = getCachedTenant(cacheKey);
        if (!tenant) {
          tenant = await Tenant.findOne({ slug: subdomain });
          if (tenant) setCachedTenant(cacheKey, tenant);
        }
      }
    }

    // 3. Check custom domain
    if (!tenant) {
      const host = (req.headers.host || '').split(':')[0].toLowerCase();
      if (host && host !== 'localhost') {
        const cacheKey = `domain:${host}`;
        tenant = getCachedTenant(cacheKey);
        if (!tenant) {
          tenant = await Tenant.findOne({ 'domains.customDomain': host });
          if (tenant) setCachedTenant(cacheKey, tenant);
        }
      }
    }

    // Attach tenant context to request
    if (tenant) {
      // Check if tenant is accessible
      if (tenant.status === 'cancelled') {
        return res.status(410).json({
          message: 'This school account has been deactivated. Please contact support.',
        });
      }
      if (tenant.status === 'suspended') {
        // Allow read-only access for suspended tenants (limited to specific routes)
        // Controllers should check tenant.status === 'suspended' for write operations
      }

      req.tenantId = tenant._id.toString();
      req.tenant = tenant;
    }

    next();
  } catch (error: any) {
    console.error('Tenant resolution error:', error.message);
    // Don't block the request — let it continue without tenant context
    next();
  }
};

/**
 * Tenant Guard Middleware
 * 
 * Use AFTER resolveTenant on routes that REQUIRE a tenant context.
 * Returns 400 if no tenant was resolved.
 */
export const requireTenant = (req: TenantRequest, res: Response, next: NextFunction) => {
  if (!req.tenantId || !req.tenant) {
    return res.status(400).json({
      message: 'Tenant context required. Access the platform via your school subdomain or provide X-Tenant-ID header.',
    });
  }
  next();
};

/**
 * Utility to invalidate the tenant cache entry (e.g., after settings update).
 */
export function invalidateTenantCache(slug: string): void {
  // Clear all possible cache keys for this tenant
  for (const [key] of tenantCache) {
    if (key.includes(slug)) {
      tenantCache.delete(key);
    }
  }
}
