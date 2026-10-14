'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export default function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('audiencemeter_theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      // Default to dark
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('audiencemeter_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Render bold segmented switcher immediately

  // Bold Segmented Switcher
  return (
    <div
      role="radiogroup"
      aria-label="Theme mode switcher"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
        border: `1.5px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.12)'}`,
        borderRadius: '9999px',
        boxShadow: theme === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
        userSelect: 'none',
      }}
      className={className}
    >
      {/* Light Option */}
      <button
        type="button"
        onClick={() => toggleTheme('light')}
        aria-checked={theme === 'light'}
        role="radio"
        title="Switch to Light Mode"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '6px 10px' : '6px 14px',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '0.3px',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          background: theme === 'light' ? '#ffffff' : 'transparent',
          color: theme === 'light' ? '#0f172a' : '#94a3b8',
          boxShadow: theme === 'light' ? '0 2px 10px rgba(0, 0, 0, 0.12)' : 'none',
          border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid transparent',
        }}
      >
        <Sun size={15} color={theme === 'light' ? '#f59e0b' : '#94a3b8'} strokeWidth={2.5} />
        {!compact && <span>Light</span>}
      </button>

      {/* Dark Option */}
      <button
        type="button"
        onClick={() => toggleTheme('dark')}
        aria-checked={theme === 'dark'}
        role="radio"
        title="Switch to Dark Mode"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '6px 10px' : '6px 14px',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '0.3px',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          background: theme === 'dark' ? '#6366f1' : 'transparent',
          color: theme === 'dark' ? '#ffffff' : '#64748b',
          boxShadow: theme === 'dark' ? '0 2px 12px rgba(99, 102, 241, 0.45)' : 'none',
          border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
        }}
      >
        <Moon size={14} color={theme === 'dark' ? '#ffffff' : '#64748b'} strokeWidth={2.5} />
        {!compact && <span>Dark</span>}
      </button>
    </div>
  );
}
