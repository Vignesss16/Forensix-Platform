import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage or system preference
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    // Add current theme class
    root.classList.add(theme);

    // Update CSS custom properties
    if (theme === 'dark') {
      root.style.setProperty('--background', '220 25% 6%');
      root.style.setProperty('--foreground', '200 20% 90%');
      root.style.setProperty('--card', '220 22% 9%');
      root.style.setProperty('--card-foreground', '200 20% 90%');
      root.style.setProperty('--popover', '220 22% 9%');
      root.style.setProperty('--popover-foreground', '200 20% 90%');
      root.style.setProperty('--primary', '185 80% 50%');
      root.style.setProperty('--primary-foreground', '220 25% 6%');
      root.style.setProperty('--secondary', '220 20% 14%');
      root.style.setProperty('--secondary-foreground', '200 20% 85%');
      root.style.setProperty('--muted', '220 18% 12%');
      root.style.setProperty('--muted-foreground', '215 15% 50%');
      root.style.setProperty('--accent', '160 70% 45%');
      root.style.setProperty('--accent-foreground', '220 25% 6%');
      root.style.setProperty('--destructive', '0 75% 55%');
      root.style.setProperty('--destructive-foreground', '0 0% 100%');
      root.style.setProperty('--warning', '35 90% 55%');
      root.style.setProperty('--warning-foreground', '220 25% 6%');
      root.style.setProperty('--border', '220 20% 16%');
      root.style.setProperty('--input', '220 20% 14%');
      root.style.setProperty('--ring', '185 80% 50%');
      root.style.setProperty('--sidebar-background', '220 25% 5%');
      root.style.setProperty('--sidebar-foreground', '200 20% 85%');
      root.style.setProperty('--sidebar-primary', '185 80% 50%');
      root.style.setProperty('--sidebar-primary-foreground', '220 25% 6%');
      root.style.setProperty('--sidebar-accent', '220 20% 12%');
      root.style.setProperty('--sidebar-accent-foreground', '200 20% 90%');
      root.style.setProperty('--sidebar-border', '220 20% 14%');
      root.style.setProperty('--sidebar-ring', '185 80% 50%');
    } else {
      // Light theme
      root.style.setProperty('--background', '0 0% 100%');
      root.style.setProperty('--foreground', '222.2 84% 4.9%');
      root.style.setProperty('--card', '0 0% 100%');
      root.style.setProperty('--card-foreground', '222.2 84% 4.9%');
      root.style.setProperty('--popover', '0 0% 100%');
      root.style.setProperty('--popover-foreground', '222.2 84% 4.9%');
      root.style.setProperty('--primary', '185 80% 50%');
      root.style.setProperty('--primary-foreground', '0 0% 100%');
      root.style.setProperty('--secondary', '210 40% 96%');
      root.style.setProperty('--secondary-foreground', '222.2 84% 4.9%');
      root.style.setProperty('--muted', '210 40% 96%');
      root.style.setProperty('--muted-foreground', '215.4 16.3% 46.9%');
      root.style.setProperty('--accent', '160 70% 45%');
      root.style.setProperty('--accent-foreground', '0 0% 100%');
      root.style.setProperty('--destructive', '0 84.2% 60.2%');
      root.style.setProperty('--destructive-foreground', '210 40% 98%');
      root.style.setProperty('--warning', '35 90% 55%');
      root.style.setProperty('--warning-foreground', '0 0% 100%');
      root.style.setProperty('--border', '214.3 31.8% 91.4%');
      root.style.setProperty('--input', '214.3 31.8% 91.4%');
      root.style.setProperty('--ring', '185 80% 50%');
      root.style.setProperty('--sidebar-background', '0 0% 98%');
      root.style.setProperty('--sidebar-foreground', '240 5.3% 26.1%');
      root.style.setProperty('--sidebar-primary', '185 80% 50%');
      root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
      root.style.setProperty('--sidebar-accent', '240 4.8% 95.9%');
      root.style.setProperty('--sidebar-accent-foreground', '240 5.9% 10%');
      root.style.setProperty('--sidebar-border', '220 13% 91%');
      root.style.setProperty('--sidebar-ring', '185 80% 50%');
    }

    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}