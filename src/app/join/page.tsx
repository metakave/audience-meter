'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Radio, KeyRound } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function GenericJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().replace(/\s/g, '');
    if (!cleanCode) {
      setError('Please enter a 6-digit presentation code.');
      return;
    }
    router.push(`/join/${cleanCode}`);
  };

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
          padding: '36px 28px',
          textAlign: 'center',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
          }}
        >
          <Radio size={28} color="#ffffff" />
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }}>
          Join Presentation
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Enter the 6-digit code shown on the presenter&apos;s screen
        </p>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              maxLength={8}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 824 915"
              style={{
                width: '100%',
                padding: '16px 20px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '1.6rem',
                letterSpacing: '4px',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '2px solid var(--border-subtle)',
                borderRadius: '14px',
                color: '#f8fafc',
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '16px', fontSize: '1.05rem', width: '100%' }}
          >
            Join Live Session <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}
          >
            <KeyRound size={14} /> Are you a presenter? Go to Home
          </a>
        </div>
      </div>
    </div>
  );
}
