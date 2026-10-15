'use client';

import React, { useEffect, useState } from 'react';
import { Presentation } from '@/types';
import { DEFAULT_PRESENTATIONS } from '@/lib/default-data';
import { savePresentation, deletePresentation, updatePresentationState } from '@/lib/storage';
import {
  Plus,
  Play,
  QrCode,
  Download,
  Trash2,
  Edit3,
  Layers,
  Radio,
  RadioOff,
  Compass,
  Lock,
  Unlock,
  ExternalLink,
  Sparkles,
  LogOut,
  FileSpreadsheet,
  AlertTriangle,
  AlertCircle,
  Users,
  BarChart2,
  X,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import AdminGuard, { lockAdminSession } from '@/components/AdminGuard';

export default function AdminDashboardPage() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // Deletion modal state
  const [deleteModalPres, setDeleteModalPres] = useState<Presentation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dataCheck, setDataCheck] = useState<{
    loading: boolean;
    participantCount: number;
    responseCount: number;
  }>({
    loading: false,
    participantCount: 0,
    responseCount: 0,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      participantCount: 0,
      responseCount: 0,
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

  const handleOpenDeleteModal = async (pres: Presentation) => {
    setDeleteModalPres(pres);
    const initialParticipants = pres.participantCount ?? 0;
    const initialResponses = pres.responseCount ?? 0;

    setDataCheck({
      loading: true,
      participantCount: initialParticipants,
      responseCount: initialResponses,
    });

    try {
      const res = await fetch(`/api/sync?code=${encodeURIComponent(pres.code)}`);
      if (res.ok) {
        const data = await res.json();
        setDataCheck({
          loading: false,
          participantCount: typeof data.participantCount === 'number' ? data.participantCount : initialParticipants,
          responseCount: Array.isArray(data.responses) ? data.responses.length : initialResponses,
        });
      } else {
        setDataCheck((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setDataCheck((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalPres) return;
    setIsDeleting(true);
    const target = deleteModalPres;

    try {
      const ok = await deletePresentation(target.id, target.code);
      if (ok) {
        setPresentations((prev) => prev.filter((p) => p.code !== target.code && p.id !== target.id));
        setDeleteModalPres(null);
        setToastMessage(`Deleted "${target.title}" (PIN: ${target.code}) successfully.`);
        setTimeout(() => setToastMessage(null), 4500);
      } else {
        alert('Failed to delete presentation. Please check server logs and try again.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('An unexpected error occurred while deleting.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSession = async (pres: Presentation) => {
    const nextLive = pres.isLive === false ? true : false;
    setPresentations((prev) =>
      prev.map((p) => (p.id === pres.id ? { ...p, isLive: nextLive } : p))
    );
    await updatePresentationState(pres.code, { isLive: nextLive });
    setToastMessage(
      nextLive
        ? `Session for "${pres.title}" is now OPEN for responses.`
        : `Session for "${pres.title}" is now CLOSED.`
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleForwardLock = async (pres: Presentation) => {
    const nextLock = !pres.lockForwardSlides;
    setPresentations((prev) =>
      prev.map((p) => (p.id === pres.id ? { ...p, lockForwardSlides: nextLock } : p))
    );
    await updatePresentationState(pres.code, { lockForwardSlides: nextLock });
    setToastMessage(
      nextLock
        ? `Forward slides locked to host for "${pres.title}".`
        : `Free participant navigation enabled for "${pres.title}".`
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const hasData = dataCheck.participantCount > 0 || dataCheck.responseCount > 0;

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

        {/* Toast Feedback */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#0f172a',
              color: '#ffffff',
              padding: '14px 20px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              fontSize: '0.9rem',
              fontWeight: 500,
              animation: 'slideUp 0.25s ease',
            }}
          >
            <CheckCircle2 size={18} color="#10b981" />
            <span>{toastMessage}</span>
          </div>
        )}

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
                  color: 'inherit',
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
          {presentations.map((pres) => {
            const hasDataBadge = (pres.participantCount ?? 0) > 0 || (pres.responseCount ?? 0) > 0;
            return (
              <div
                key={pres.id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="code-pill">PIN: {pres.code}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {pres.questions.length} {pres.questions.length === 1 ? 'slide' : 'slides'}
                      </span>
                      {/* Delete Presentation Icon Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(pres)}
                        title={`Delete presentation "${pres.title}"`}
                        aria-label={`Delete presentation "${pres.title}"`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          padding: 0,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#ef4444';
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.borderColor = '#ef4444';
                          e.currentTarget.style.transform = 'scale(1.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', lineHeight: 1.3 }}>
                    {pres.title}
                  </h2>

                  {/* Status Badges: Live/Closed, Self-Paced, Response Counts */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
                    {/* Live vs Closed Badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: pres.isLive !== false ? '#10b981' : '#f87171',
                        background: pres.isLive !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        border: `1px solid ${pres.isLive !== false ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {pres.isLive !== false ? <Radio size={12} /> : <RadioOff size={12} />}
                      <span>{pres.isLive !== false ? 'Session Open' : 'Session Closed'}</span>
                    </span>

                    {/* Navigation Mode Badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: pres.lockForwardSlides ? '#f59e0b' : '#818cf8',
                        background: pres.lockForwardSlides ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                        border: `1px solid ${pres.lockForwardSlides ? 'rgba(245, 158, 11, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {pres.lockForwardSlides ? <Lock size={11} /> : <Compass size={11} />}
                      <span>{pres.lockForwardSlides ? 'Paced by Host' : 'Self-Paced (Free)'}</span>
                    </span>

                    {hasDataBadge && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        <Users size={11} />
                        <span>{pres.participantCount || 0}</span>
                        <span>•</span>
                        <BarChart2 size={11} />
                        <span>{pres.responseCount || 0} votes</span>
                      </span>
                    )}
                  </div>

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
                  {/* Quick Controls: Toggle Live Session / Navigation Mode */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleSession(pres)}
                      title={pres.isLive !== false ? 'Close this session to prevent further responses' : 'Reopen session to accept responses'}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: pres.isLive !== false ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.1)',
                        border: `1px solid ${pres.isLive !== false ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.3)'}`,
                        color: pres.isLive !== false ? '#ef4444' : '#10b981',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {pres.isLive !== false ? <RadioOff size={13} /> : <Radio size={13} />}
                      <span>{pres.isLive !== false ? 'Close Session' : 'Reopen Session'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleForwardLock(pres)}
                      title={pres.lockForwardSlides ? 'Allow participants to navigate to any slide freely' : 'Lock forward slides so participants only see what host is presenting'}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: pres.lockForwardSlides ? 'rgba(99, 102, 241, 0.1)' : 'rgba(245, 158, 11, 0.08)',
                        border: `1px solid ${pres.lockForwardSlides ? 'rgba(99, 102, 241, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                        color: pres.lockForwardSlides ? '#818cf8' : '#f59e0b',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {pres.lockForwardSlides ? <Compass size={13} /> : <Lock size={13} />}
                      <span>{pres.lockForwardSlides ? 'Allow Free Nav' : 'Lock Forward'}</span>
                    </button>
                  </div>

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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a
                        href={`/api/export-xlsx/${pres.code}`}
                        download
                        title="Download all participants and their responses in Excel (.xlsx) format"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#10b981',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        <FileSpreadsheet size={14} /> Download Excel (.xlsx)
                      </a>

                      <a
                        href={`/api/export/${pres.code}`}
                        download
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Download size={13} /> CSV
                      </a>
                    </div>

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
            );
          })}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalPres && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: '20px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) {
                setDeleteModalPres(null);
              }
            }}
          >
            <div
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '520px',
                padding: '28px',
                borderRadius: '16px',
                border: hasData ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                position: 'relative',
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalPres(null)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>

              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: hasData ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: hasData ? '#ef4444' : '#f59e0b',
                    flexShrink: 0,
                  }}
                >
                  {hasData ? <AlertTriangle size={24} /> : <Trash2 size={24} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                    {hasData ? 'Delete Presentation with Data?' : 'Delete Presentation?'}
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    PIN: {deleteModalPres.code} • {deleteModalPres.questions.length} slides
                  </span>
                </div>
              </div>

              {/* Presentation Target Title */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '18px',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Target Presentation
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2px' }}>
                  {deleteModalPres.title}
                </div>
              </div>

              {/* Dynamic Warning Reminder Based on Data Presence */}
              {dataCheck.loading ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.88rem',
                    marginBottom: '20px',
                  }}
                >
                  <Loader2 size={16} className="animate-spin" />
                  <span>Checking audience responses and participant records...</span>
                </div>
              ) : hasData ? (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    marginBottom: '22px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#ef4444',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      marginBottom: '8px',
                    }}
                  >
                    <AlertTriangle size={18} />
                    <span>⚠️ Warning: This presentation is not empty!</span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                    This presentation already contains live audience data and registrations:
                  </p>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.18)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: '#ef4444',
                      }}
                    >
                      <Users size={15} />
                      <span>{dataCheck.participantCount} Registered Participant{dataCheck.participantCount === 1 ? '' : 's'}</span>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.18)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: '#ef4444',
                      }}
                    >
                      <BarChart2 size={15} />
                      <span>{dataCheck.responseCount} Audience Response{dataCheck.responseCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Permanently deleting will destroy all audience submissions, participant phone/email profiles, and Excel (.xlsx) export records. <strong>This action cannot be undone.</strong>
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    marginBottom: '22px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#f59e0b',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      marginBottom: '4px',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>Empty Presentation</span>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    This presentation has no recorded audience responses or participants. Are you sure you want to permanently delete it?
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteModalPres(null)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '0.9rem' }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    opacity: isDeleting ? 0.7 : 1,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDeleting) e.currentTarget.style.background = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    if (!isDeleting) e.currentTarget.style.background = '#ef4444';
                  }}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>Yes, Delete Presentation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
