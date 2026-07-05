export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  border: string;
  rowAlternate: string;
  heading: string;
  text: string;
  headerColor: string;
}

export const getThemeColors = (tenant: any): ThemeColors => {
  const slug = (tenant?.slug || '').trim().toLowerCase();
  const isAlQalam = slug === 'al-qalam-academy' || slug === 'alqalam' || slug === 'alqalamacademy';

  if (isAlQalam) {
    return {
      primary: '#800020',      // Maroon
      secondary: '#4169E1',    // Royal Blue
      accent: '#4169E1',       // Royal Blue
      border: '#e2e8f0',       // Light Gray
      rowAlternate: '#f7f7f7', // Very light gray
      heading: '#800020',
      text: '#333333',
      headerColor: '#1e3a8a'   // Dark Blue
    };
  }

  const branding = tenant?.branding || {};
  const primaryColor = branding.primaryColor || '#0A2240';
  const secondaryColor = branding.secondaryColor || '#d4af37';
  
  return {
    primary: primaryColor,
    secondary: secondaryColor,
    accent: branding.accentColor || secondaryColor,
    border: '#c5d5c5',
    rowAlternate: '#fafcfa',
    heading: primaryColor,
    text: '#1a1a1a',
    headerColor: '#1e3a8a'     // Dark Blue
  };
};
