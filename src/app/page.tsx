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

export default function HomePage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomCode.trim().replace(/\s/g, '');
    if (!clean) {
      setError('Please enter a 6-digit presentation code.');
      return;
    }
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
          <Sparkles size={14} /> Real-Time Live Polling & Word Clouds
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
          Turn Any Presentation into an{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Interactive Experience
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
          Ultra-lightweight audience response system. Single & multiple choice polls, live dynamic word clouds, open Q&amp;A, and rating meters for 100-200+ participants.
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
            Joining as an Attendee?
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
            Enter the 6-digit room PIN from the presenter&apos;s screen:
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
            <button type="submit" className="btn-primary" style={{ padding: '14px 20px' }}>
              Join <ArrowRight size={18} />
            </button>
          </form>
        </div>

        {/* Ready-to-Test Demo Session Banner */}
        <div
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '780px',
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            textAlign: 'left',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="code-pill">PIN: 824915</span>
              <span style={{ fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 600 }}>
                Pre-configured Interactive Demo
              </span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
              Audience Pulse & Interactive Q&amp;A
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Includes MCQ, Word Cloud, True/False, Multiple Choice, and Rating Scale slides.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href="/present/824915"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '10px 16px' }}
            >
              <Play size={14} fill="#ffffff" /> Open Presentation Screen
            </a>
            <a
              href="/join/824915"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '10px 16px' }}
            >
              Join as Participant
            </a>
          </div>
        </div>

        {/* Feature Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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
            <div style={{ color: '#34d399', marginBottom: '12px' }}>
              <Users size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
              Lead Collection Built-in
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Collect First Name, Last Name, WhatsApp number, and Email seamlessly with one-click CSV export.
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
