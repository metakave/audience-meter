'use client';

import React, { useEffect, useState } from 'react';
import { Presentation } from '@/types';
import { DEFAULT_PRESENTATIONS } from '@/lib/default-data';
import { savePresentation } from '@/lib/storage';
import {
  Plus,
  Play,
  QrCode,
  Download,
  Trash2,
  Edit3,
  Layers,
  Radio,
  ExternalLink,
  Sparkles,
  LogOut,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import AdminGuard, { lockAdminSession } from '@/components/AdminGuard';

export default function AdminDashboardPage() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    async function checkHealthAndLoad() {
      setLoading(true);
      try {
        const healthRes = await fetch('/api/health');
        if (healthRes.ok) {
          const healthJson = await healthRes.json();
          setHealthStatus(healthJson);
        }
      } catch {}

      try {
        const res = await fetch('/api/sync?action=list');
        if (res.ok) {
          const json = await res.json();
          if (json.presentations && json.presentations.length > 0) {
            setPresentations(json.presentations);
          } else {
            setPresentations(DEFAULT_PRESENTATIONS);
          }
        } else {
          setPresentations(DEFAULT_PRESENTATIONS);
        }
      } catch {
        setPresentations(DEFAULT_PRESENTATIONS);
      }
      setLoading(false);
    }
    checkHealthAndLoad();
  }, []);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Generate unique 6-digit room code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const id = `pres_${Date.now()}`;

    const newPres: Presentation = {
      id,
      title: newTitle.trim(),
      code,
      currentQuestionIndex: 0,
      isLive: true,
      isLocked: false,
      showResults: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: [
        {
          id: `q_${Date.now()}_1`,
          type: 'mcq',
          title: 'What is your primary goal for today?',
          showResultsToAudience: true,
          isLocked: false,
          options: [
            { id: 'opt_1', text: 'Learn something new' },
            { id: 'opt_2', text: 'Network with peers' },
            { id: 'opt_3', text: 'Explore practical tools' },
          ],
        },
      ],
    };

    await savePresentation(newPres);
    setPresentations([newPres, ...presentations]);
    setNewTitle('');
    setCreating(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this presentation?')) {
      setPresentations((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <AdminGuard>
      <div style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '36px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.4rem' }}>⚡</span>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Presentations Dashboard</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Manage interactive polls, live slides, and audience responses
            </p>
            {healthStatus && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                {healthStatus.status === 'connected' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontWeight: 600,
                    }}
                  >
                    ● Supabase Realtime Connected
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#f59e0b',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontWeight: 600,
                    }}
                    title={healthStatus.message}
                  >
                    ● Local Sync Engine Active
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ThemeToggle />
            <button onClick={() => setCreating(true)} className="btn-primary">
              <Plus size={18} /> New Presentation
            </button>
            <button
              onClick={lockAdminSession}
              title="Lock Admin Session"
              className="btn-secondary"
              style={{ padding: '10px 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

      {/* New Presentation Modal / Inline Card */}
      {creating && (
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            marginBottom: '32px',
            border: '1px solid var(--accent-primary)',
          }}
        >
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>
            Create New Presentation
          </h3>
          <form onSubmit={handleCreateNew} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              autoFocus
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Q3 All-Hands Live Poll & Brainstorming"
              style={{
                flex: 1,
                minWidth: '280px',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '1rem',
              }}
            />
            <button type="submit" className="btn-primary">
              Create & Add Questions
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Presentations List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {presentations.map((pres) => (
          <div
            key={pres.id}
            className="glass-panel"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span className="code-pill">PIN: {pres.code}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {pres.questions.length} {pres.questions.length === 1 ? 'slide' : 'slides'}
                </span>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', lineHeight: 1.3 }}>
                {pres.title}
              </h2>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                {pres.questions.slice(0, 3).map((q) => (
                  <span
                    key={q.id}
                    style={{
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--text-secondary)',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {q.type.replace('_', ' ')}
                  </span>
                ))}
                {pres.questions.length > 3 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '2px 4px' }}>
                    +{pres.questions.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <a
                  href={`/present/${pres.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                >
                  <Play size={14} fill="#ffffff" /> Present Live
                </a>

                <a
                  href={`/admin/${pres.id}?code=${pres.code}`}
                  className="btn-secondary"
                  style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                >
                  <Edit3 size={14} /> Edit Slides
                </a>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <a
                  href={`/api/export/${pres.code}`}
                  download
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Download size={14} /> Export CSV
                </a>

                <a
                  href={`/join/${pres.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    color: '#818cf8',
                  }}
                >
                  <ExternalLink size={14} /> Test Join Link
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </AdminGuard>
  );
}
