'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Radio,
  Play,
  Settings,
  Sparkles,
  Users,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  Zap,
  Globe,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function HomePage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomCode.trim().replace(/\s/g, '');
    if (!clean) {
      setError('Please enter a 6-digit room or survey code.');
      return;
    }
    setError('');
    setIsChecking(true);

    try {
      const res = await fetch(`/api/sync?code=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.presentation?.type === 'survey') {
          router.push(`/survey/${clean}`);
          return;
        }
      }
    } catch {}

    router.push(`/join/${clean}`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 32px',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1.1rem',
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              AudienceMeter
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ThemeToggle />
          <a href="/admin" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <Settings size={15} /> Presenter Dashboard
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          maxWidth: '960px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        {/* Live Tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#a5b4fc',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '24px',
          }}
        >
          <Sparkles size={14} /> Live Audience Polling & Shareable Survey Forms
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-1px',
            marginBottom: '16px',
          }}
        >
          Interactive Polling &{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Google Form-Style Surveys
          </span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'var(--text-secondary)',
            maxWidth: '640px',
            marginBottom: '36px',
            lineHeight: 1.5,
          }}
        >
          Collect live audience feedback during presentations, or share survey form links with anyone. Responses saved securely in database with one-click Excel (.xlsx) export.
        </p>

        {/* Join Card */}
        <div
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '460px',
            padding: '28px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
            marginBottom: '48px',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
            Enter Room or Survey Code
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
            Enter the 6-digit room PIN or survey code to participate:
          </p>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '14px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleJoin} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              maxLength={8}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. 824 915"
              style={{
                flex: 1,
                padding: '14px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '1.3rem',
                letterSpacing: '3px',
                textAlign: 'center',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                color: '#ffffff',
              }}
            />
            <button type="submit" disabled={isChecking} className="btn-primary" style={{ padding: '14px 20px' }}>
              {isChecking ? 'Checking...' : 'Continue'} <ArrowRight size={18} />
            </button>
          </form>
        </div>

        {/* Demo Cards Section */}
        <div style={{ width: '100%', maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Live Polling Demo */}
          <div
            className="glass-panel"
            style={{
              padding: '22px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              textAlign: 'left',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="code-pill">PIN: 824915</span>
                <span style={{ fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 600 }}>
                  ⚡ Live Interactive Presentation Demo
                </span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                Audience Pulse & Interactive Q&amp;A
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Live slide-by-slide voting, animated word clouds, and real-time presenter view.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href="/present/824915"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ fontSize: '0.85rem', padding: '10px 16px' }}
              >
                <Play size={14} fill="#ffffff" /> Presenter Screen
              </a>
              <a
                href="/join/824915"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ fontSize: '0.85rem', padding: '10px 16px' }}
              >
                Join Live
              </a>
            </div>
          </div>

          {/* Survey Form Demo */}
          <div
            className="glass-panel"
            style={{
              padding: '22px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              textAlign: 'left',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderRadius: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="code-pill">Code: 512340</span>
                <span style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 600 }}>
                  📋 Shareable Survey Form Demo (Google Forms Style)
                </span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                Event &amp; Workshop Experience Feedback Form
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Standalone share link. Anyone can submit feedback, saved to database and exported to Excel.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href="/survey/512340"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{
                  fontSize: '0.85rem',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  borderColor: 'transparent',
                }}
              >
                Try Survey Form
              </a>
              <a
                href="/api/export-xlsx/512340"
                download
                className="btn-secondary"
                style={{ fontSize: '0.85rem', padding: '10px 16px', color: '#10b981' }}
              >
                Download Excel (.xlsx)
              </a>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            width: '100%',
            marginTop: '60px',
            textAlign: 'left',
          }}
        >
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ color: '#818cf8', marginBottom: '12px' }}>
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
              Ultra Lightweight &amp; Fast
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Engineered for low bandwidth. Participants on mobile 2G/3G connections load in milliseconds.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ color: '#c084fc', marginBottom: '12px' }}>
              <BarChart3 size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
              Google Forms Style Surveys
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Share direct links for post-event surveys or asynchronous feedback. No live presentation required.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ color: '#34d399', marginBottom: '12px' }}>
              <Users size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
              Full Excel (.xlsx) Export
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Instant spreadsheet export formatted like Google Sheets with respondent matrix, questions, and contact info.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ color: '#fbbf24', marginBottom: '12px' }}>
              <Globe size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
              100% Free Hosting Ready
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Deployable directly on Vercel Free tier paired with Supabase PostgreSQL and Realtime WebSockets.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '24px 32px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}
      >
        <div>AudienceMeter — Modern Interactive Presentation Platform</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="/admin" style={{ color: 'var(--text-secondary)' }}>
            Admin Dashboard
          </a>
          <a href="/join" style={{ color: 'var(--text-secondary)' }}>
            Join Session
          </a>
        </div>
      </footer>
    </div>
  );
}
