'use client';

import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const ADMIN_PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || '5599';
const AUTH_STORAGE_KEY = 'audiencemeter_admin_authenticated';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function lockAdminSession() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.reload();
  }
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [inputPasscode, setInputPasscode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const isAuth =
      sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true' ||
      localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    setIsAuthenticated(isAuth);
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPasscode.trim() === ADMIN_PASSCODE) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect passcode. Please try again.');
      setInputPasscode('');
    }
  };

  // Prevent flicker during initial client check
  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Verifying security credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
          <ThemeToggle />
        </div>

        <div
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '36px 30px',
            textAlign: 'center',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
            }}
          >
            <Lock size={26} color="#ffffff" />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Admin Dashboard
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Enter the 4-digit presenter security passcode to manage presentations and slides
          </p>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                autoFocus
                maxLength={10}
                value={inputPasscode}
                onChange={(e) => setInputPasscode(e.target.value)}
                placeholder="Enter Passcode"
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.4rem',
                  letterSpacing: '6px',
                  fontWeight: 700,
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '14px', fontSize: '1rem', width: '100%' }}
            >
              Unlock Dashboard <ArrowRight size={18} />
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <a href="/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ← Return to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
