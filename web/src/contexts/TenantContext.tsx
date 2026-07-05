import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  nameArabic: string;
  subHeader: string;
  branding: {
    logo: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
    loginBanner: string;
  };
  contact: {
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  academicConfig: {
    currentAcademicYear: string;
    currentTerm: string;
  };
  subscription: {
    planId: string;
    status: string;
    currentPeriodEnd: string;
  };
}

interface TenantContextType {
  tenant: TenantInfo | null;
  isSaaSMode: boolean; // True if on apex domain or localhost without a specific tenant (the main product landing page)
  loading: boolean;
  error: string | null;
  resolvedSlug: string | null;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [isSaaSMode, setIsSaaSMode] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);

  const resolveTenantInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine subdomain or custom domain from window.location
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      
      let slug: string | null = null;

      // Localhost fallback / testing override in localstorage
      const urlParams = new URLSearchParams(window.location.search);
      const paramOverride = urlParams.get('tenant');
      const paramMode = urlParams.get('mode');
      
      let localOverride = localStorage.getItem('huffaz_tenant_override') || 'darulhikmah';
      if (paramOverride) {
        localOverride = paramOverride;
        localStorage.setItem('huffaz_tenant_override', paramOverride);
      }
      if (paramMode === 'saas') {
        localOverride = 'saas';
        localStorage.setItem('huffaz_tenant_override', 'saas');
      }

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // If testing on localhost, we allow manual/localStorage toggle or default to 'darulhikmah'
        if (localOverride === 'saas') {
          slug = null;
          setIsSaaSMode(true);
        } else {
          slug = localOverride;
          setIsSaaSMode(false);
        }
      } else if (hostname.endsWith('.localhost')) {
        const subdomain = hostname.slice(0, -10); // Remove ".localhost"
        const reserved = ['www', 'api', 'admin', 'app', 'platform'];
        if (!reserved.includes(subdomain)) {
          slug = subdomain;
          setIsSaaSMode(false);
        } else {
          slug = null;
          setIsSaaSMode(true);
        }
      } else if (parts.length >= 3) {
        const subdomain = parts[0];
        const reserved = ['www', 'api', 'admin', 'app', 'platform'];
        if (!reserved.includes(subdomain)) {
          slug = subdomain;
          setIsSaaSMode(false);
        } else {
          slug = null;
          setIsSaaSMode(true);
        }
      } else {
        // Apex domain (e.g. smartschool.africa)
        slug = null;
        setIsSaaSMode(true);
      }

      setResolvedSlug(slug);

      if (slug) {
        // Save to api header config & local storage so interceptors can read it
        localStorage.setItem('huffaz_tenant_slug', slug);
        
        // Fetch tenant details from /public/settings
        const res = await api.get('/public/settings', {
          headers: {
            'X-Tenant-ID': slug
          }
        });

        if (res.data) {
          setTenant(res.data);
          
          // Dynamically change page title
          document.title = `${res.data.schoolName} — Portal`;
          
          // Dynamically inject tenant theme by fetching CSS via API (ensures X-Tenant-ID header is attached)
          let style = document.getElementById('tenant-theme-style') as HTMLStyleElement | null;
          if (!style) {
            style = document.createElement('style');
            style.id = 'tenant-theme-style';
            document.head.appendChild(style);
          }

          // Use the API client so interceptors attach `X-Tenant-ID` header for tenant resolution
          try {
            // We intentionally do not include the full base URL so the axios instance's baseURL is used.
            const res = await api.get(`/public/theme?t=${Date.now()}`, { responseType: 'text' });
            style.innerHTML = res.data || '';
          } catch (err: any) {
            console.error('Failed to load tenant theme stylesheet:', err?.message || err);
            style.innerHTML = '';
          }
        }
      } else {
        localStorage.removeItem('huffaz_tenant_slug');
        setTenant(null);
        document.title = 'SmartSchool Africa — Enterprise School Management System';
        
        // Remove tenant CSS link if any
        const link = document.getElementById('tenant-theme-link');
        if (link) link.remove();
      }
    } catch (err: any) {
      console.error('Tenant resolution failed:', err);
      setError(err.response?.data?.message || 'Failed to load school tenant profile');
      setIsSaaSMode(true); // Fallback to SaaS platform view
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resolveTenantInfo();
  }, []);

  return (
    <TenantContext.Provider value={{
      tenant,
      isSaaSMode,
      loading,
      error,
      resolvedSlug,
      refreshTenant: resolveTenantInfo
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
