'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  Share2,
  Eye,
  FileText,
  BarChart3,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import AdminGuard, { lockAdminSession } from '@/components/AdminGuard';

export default function AdminDashboardPage() {
  const [presentations, setPresentations] = useState<Presentation[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('audiencemeter_cached_presentations');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_PRESENTATIONS;
  });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createType, setCreateType] = useState<'presentation' | 'survey'>('presentation');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'presentation' | 'survey'>('all');
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // Responses viewer modal state
  const [responsesModalPres, setResponsesModalPres] = useState<Presentation | null>(null);
  const [responsesData, setResponsesData] = useState<{
    loading: boolean;
    responses: any[];
    participants: any[];
  }>({ loading: false, responses: [], participants: [] });
  const [responsesTab, setResponsesTab] = useState<'analytics' | 'grid'>('analytics');

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

  const fetchPresentationsList = useCallback(async (showIndicator = true) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const res = await fetch('/api/sync?action=list', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json?.presentations && json.presentations.length > 0) {
          setPresentations(json.presentations);
          try {
            localStorage.setItem('audiencemeter_cached_presentations', JSON.stringify(json.presentations));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Failed to refresh presentations list:', err);
    } finally {
      setLoading(false);
      if (showIndicator) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch health asynchronously in the background (non-blocking)
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((healthJson) => {
        if (isMounted && healthJson) setHealthStatus(healthJson);
      })
      .catch(() => {});

    // 2. Fetch fresh presentations list
    fetchPresentationsList(true);

    // 3. Auto-refresh when tab regains focus
    const handleFocus = () => {
      fetchPresentationsList(false);
    };
    window.addEventListener('focus', handleFocus);

    // 4. Background refresh every 12 seconds to keep response counts in sync
    const interval = setInterval(() => {
      fetchPresentationsList(false);
    }, 12000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [fetchPresentationsList]);

  const handleCopySurveyLink = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}/survey/${code}`;
    navigator.clipboard.writeText(url);
    setToastMessage(`Survey share link copied: ${url}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenResponsesModal = async (pres: Presentation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setResponsesModalPres(pres);
    setResponsesTab('analytics');
    setResponsesData({ loading: true, responses: [], participants: [] });

    try {
      const res = await fetch(`/api/sync?code=${encodeURIComponent(pres.code)}`);
      if (res.ok) {
        const data = await res.json();
        setResponsesData({
          loading: false,
          responses: data.responses || [],
          participants: data.participants || [],
        });
      } else {
        setResponsesData({ loading: false, responses: [], participants: [] });
      }
    } catch {
      setResponsesData({ loading: false, responses: [], participants: [] });
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const isSurvey = createType === 'survey';
    // Generate unique 6-digit room code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const id = isSurvey ? `survey_${Date.now()}` : `pres_${Date.now()}`;

    const newPres: Presentation = {
      id,
      title: newTitle.trim(),
      code,
      type: isSurvey ? 'survey' : 'presentation',
      description: isSurvey
        ? newDescription.trim() || 'Please take a moment to provide your valuable feedback.'
        : '',
      surveySettings: isSurvey
        ? {
            collectParticipantInfo: true,
            requireName: false,
            requireEmail: false,
            requireWhatsapp: false,
            isAnonymous: true,
            thankYouMessage: 'Thank you for your valuable feedback!',
            allowMultipleSubmissions: true,
            submitButtonText: 'Submit Feedback',
          }
        : undefined,
      currentQuestionIndex: 0,
      isLive: true,
      isLocked: false,
      lockForwardSlides: false,
      showResults: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      participantCount: 0,
      responseCount: 0,
      questions: isSurvey
        ? [
            {
              id: `q_${Date.now()}_1`,
              type: 'rating_scale',
              title: 'How would you rate your overall experience?',
              description: 'Rate from 1 (Poor) to 5 (Outstanding)',
              required: true,
              minRating: 1,
              maxRating: 5,
              showResultsToAudience: true,
              isLocked: false,
            },
            {
              id: `q_${Date.now()}_2`,
              type: 'mcq',
              title: 'How relevant was this content or service to you?',
              description: 'Select one option',
              required: true,
              options: [
                { id: 'opt_1', text: 'Extremely relevant & actionable' },
                { id: 'opt_2', text: 'Somewhat relevant' },
                { id: 'opt_3', text: 'Not relevant' },
              ],
              showResultsToAudience: true,
              isLocked: false,
            },
            {
              id: `q_${Date.now()}_3`,
              type: 'long_answer',
              title: 'What suggestions or comments do you have for improvement?',
              description: 'Open-ended feedback',
              required: false,
              showResultsToAudience: true,
              isLocked: false,
            },
          ]
        : [
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
    const updated = [newPres, ...presentations];
    setPresentations(updated);
    try {
      localStorage.setItem('audiencemeter_cached_presentations', JSON.stringify(updated));
    } catch {}
    setNewTitle('');
    setNewDescription('');
    setCreating(false);
    setToastMessage(`Created new ${isSurvey ? 'survey form' : 'presentation'} "${newPres.title}" (PIN: ${code})!`);
    setTimeout(() => setToastMessage(null), 3500);
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
        setPresentations((prev) => {
          const updated = prev.filter((p) => p.code !== target.code && p.id !== target.id);
          try {
            localStorage.setItem('audiencemeter_cached_presentations', JSON.stringify(updated));
          } catch {}
          return updated;
        });
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <ThemeToggle />
            <button
              onClick={() => {
                setCreateType('survey');
                setCreating(true);
              }}
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                borderColor: 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FileText size={16} /> New Survey Form
            </button>
            <button
              onClick={() => {
                setCreateType('presentation');
                setCreating(true);
              }}
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={16} /> New Live Poll
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

        {/* Creation Card */}
        {creating && (
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              marginBottom: '32px',
              border: '1.5px solid var(--accent-primary)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>{createType === 'survey' ? '📋' : '⚡'}</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {createType === 'survey' ? 'Create New Survey Form (Shareable Link)' : 'Create New Live Presentation & Poll'}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCreateType('survey')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: createType === 'survey' ? 'rgba(168, 85, 247, 0.18)' : 'transparent',
                    border: `1px solid ${createType === 'survey' ? '#a855f7' : 'var(--border-subtle)'}`,
                    color: createType === 'survey' ? '#c084fc' : 'var(--text-secondary)',
                  }}
                >
                  📋 Survey Form
                </button>
                <button
                  type="button"
                  onClick={() => setCreateType('presentation')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: createType === 'presentation' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                    border: `1px solid ${createType === 'presentation' ? '#6366f1' : 'var(--border-subtle)'}`,
                    color: createType === 'presentation' ? '#818cf8' : 'var(--text-secondary)',
                  }}
                >
                  ⚡ Live Poll
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateNew} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  {createType === 'survey' ? 'Survey Title *' : 'Presentation Title *'}
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={createType === 'survey' ? 'e.g. Post-Workshop Feedback & Experience Survey' : 'e.g. Q3 All-Hands Live Poll & Brainstorming'}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'inherit',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {createType === 'survey' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Survey Description / Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g. Thank you for attending! Please take 2 minutes to share your thoughts."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      color: 'inherit',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start', marginTop: '6px' }}>
                <button type="submit" className="btn-primary">
                  {createType === 'survey' ? 'Create Survey & Configure' : 'Create & Add Slides'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'all' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${activeTab === 'all' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              color: activeTab === 'all' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            All Items ({presentations.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presentation')}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'presentation' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${activeTab === 'presentation' ? '#6366f1' : 'var(--border-subtle)'}`,
              color: activeTab === 'presentation' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>⚡ Live Polls</span>
            <span>({presentations.filter((p) => p.type !== 'survey').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('survey')}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'survey' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${activeTab === 'survey' ? '#8b5cf6' : 'var(--border-subtle)'}`,
              color: activeTab === 'survey' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📋 Survey Forms</span>
            <span>({presentations.filter((p) => p.type === 'survey').length})</span>
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => fetchPresentationsList(true)}
              disabled={isRefreshing}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: isRefreshing ? 'default' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: isRefreshing ? '#10b981' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
              title="Refresh submissions and live responses"
            >
              <RotateCcw size={12} style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Presentations List */}
        {presentations.length === 0 && isRefreshing ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-panel"
                style={{
                  height: '260px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {presentations
              .filter((p) => {
                if (activeTab === 'presentation') return p.type !== 'survey';
                if (activeTab === 'survey') return p.type === 'survey';
                return true;
              })
              .map((pres) => {
              const isSurvey = pres.type === 'survey';
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
                    borderRadius: '16px',
                    border: isSurvey
                      ? '1px solid rgba(168, 85, 247, 0.25)'
                      : '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    {/* Top Row: Type Badge, PIN & Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isSurvey ? 'rgba(168, 85, 247, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            border: `1px solid ${isSurvey ? 'rgba(168, 85, 247, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`,
                            color: isSurvey ? '#c084fc' : '#818cf8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isSurvey ? '📋 Survey Form' : '⚡ Live Poll'}
                        </span>
                        <span className="code-pill">Code: {pres.code}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {pres.questions.length} {pres.questions.length === 1 ? 'question' : 'questions'}
                        </span>
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(pres)}
                          title={`Delete "${pres.title}"`}
                          aria-label={`Delete "${pres.title}"`}
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

                    <h2 style={{ fontSize: '1.22rem', fontWeight: 700, marginBottom: '6px', lineHeight: 1.3 }}>
                      {pres.title}
                    </h2>

                    {pres.description && (
                      <p
                        style={{
                          fontSize: '0.84rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '12px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.4,
                        }}
                      >
                        {pres.description}
                      </p>
                    )}

                    {/* Status Badges: Live/Closed, Self-Paced, Response Counts */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
                      {/* Live vs Closed Badge */}
                      <span
                        onClick={() => handleToggleSession(pres)}
                        title="Click to toggle session open/closed"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          color: pres.isLive !== false ? '#10b981' : '#f87171',
                          background: pres.isLive !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          border: `1px solid ${pres.isLive !== false ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {pres.isLive !== false ? <Radio size={12} /> : <RadioOff size={12} />}
                        <span>{pres.isLive !== false ? 'Open for Responses' : 'Closed'}</span>
                      </span>

                      {!isSurvey && (
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
                          <span>{pres.lockForwardSlides ? 'Paced by Host' : 'Self-Paced'}</span>
                        </span>
                      )}

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
                          <span>{pres.participantCount || 0} respondents</span>
                          <span>•</span>
                          <BarChart2 size={11} />
                          <span>{pres.responseCount || 0} answers</span>
                        </span>
                      )}
                    </div>

                    {/* Question type chips */}
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
                    {/* Primary Row */}
                    {isSurvey ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={(e) => handleCopySurveyLink(pres.code, e)}
                          className="btn-primary"
                          style={{
                            padding: '10px 12px',
                            fontSize: '0.84rem',
                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            borderColor: 'transparent',
                          }}
                          title="Copy shareable Google Forms style link"
                        >
                          <Share2 size={14} /> Copy Share Link
                        </button>

                        <a
                          href={`/survey/${pres.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ padding: '10px 12px', fontSize: '0.84rem' }}
                          title="Open survey form in new tab"
                        >
                          <Eye size={14} /> Open Form
                        </a>
                      </div>
                    ) : (
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
                    )}

                    {/* Secondary Row: View Responses & Edit/Test Link */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {(() => {
                        const submissionCount = pres.participantCount && pres.participantCount > 0
                          ? pres.participantCount
                          : (isSurvey && pres.responseCount
                              ? Math.max(1, Math.ceil(pres.responseCount / Math.max(1, pres.questions?.length || 1)))
                              : (pres.participantCount || 0));
                        return (
                          <button
                            type="button"
                            onClick={(e) => handleOpenResponsesModal(pres, e)}
                            className="btn-secondary"
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.82rem',
                              color: submissionCount > 0 ? '#818cf8' : 'var(--text-secondary)',
                              fontWeight: submissionCount > 0 ? 700 : 500,
                            }}
                            title="View live responses, analytics, and answers table"
                          >
                            <BarChart3 size={14} />
                            <span>View Responses{submissionCount > 0 ? ` (${submissionCount})` : ''}</span>
                          </button>
                        );
                      })()}

                      {isSurvey ? (
                        <a
                          href={`/admin/${pres.id}?code=${pres.code}`}
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                        >
                          <Edit3 size={14} /> Edit Questions
                        </a>
                      ) : (
                        <a
                          href={`/join/${pres.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                        >
                          <ExternalLink size={14} /> Test Join
                        </a>
                      )}
                    </div>

                    {/* Bottom Export Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                          href={`/api/export-xlsx/${pres.code}`}
                          download
                          title="Download all responses and participant details in Excel (.xlsx) format"
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

                      {isSurvey && (
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          Shareable Link Form
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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

        {/* Responses & Analytics Modal */}
        {responsesModalPres && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: '24px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setResponsesModalPres(null);
              }
            }}
          >
            <div
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '920px',
                height: '88vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '20px',
                padding: 0,
                overflow: 'hidden',
                boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.7)',
                border: '1px solid var(--border-strong)',
              }}
            >
              {/* Modal Top Header */}
              <div
                style={{
                  padding: '22px 28px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-secondary)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: responsesModalPres.type === 'survey' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        border: `1px solid ${responsesModalPres.type === 'survey' ? 'rgba(168, 85, 247, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`,
                        color: responsesModalPres.type === 'survey' ? '#c084fc' : '#818cf8',
                      }}
                    >
                      {responsesModalPres.type === 'survey' ? '📋 Survey Form' : '⚡ Live Poll'}
                    </span>
                    <span className="code-pill">Code: {responsesModalPres.code}</span>
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
                    {responsesModalPres.title}
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <a
                    href={`/api/export-xlsx/${responsesModalPres.code}`}
                    download
                    className="btn-primary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.84rem',
                      background: '#10b981',
                      borderColor: '#10b981',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Export complete responses to Excel (.xlsx)"
                  >
                    <FileSpreadsheet size={15} /> Export to Excel (.xlsx)
                  </a>

                  <button
                    type="button"
                    onClick={() => setResponsesModalPres(null)}
                    className="btn-secondary"
                    style={{ padding: '6px 10px', borderRadius: '8px' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Subheader: Stats Cards & View Tabs */}
              <div
                style={{
                  padding: '16px 28px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                {/* Stat pills */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <Users size={15} color="#818cf8" />
                    <span>
                      <strong>
                        {
                          new Set(responsesData.responses.map((r: any) => r.participantId)).size ||
                          responsesData.participants.length ||
                          responsesModalPres.participantCount ||
                          0
                        }
                      </strong>{' '}
                      Respondents
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <BarChart2 size={15} color="#10b981" />
                    <span>
                      <strong>{responsesData.responses.length}</strong> Total Answers
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <Layers size={15} color="#c084fc" />
                    <span>
                      <strong>{responsesModalPres.questions.length}</strong> Questions
                    </span>
                  </div>
                </div>

                {/* View Switcher */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(0, 0, 0, 0.25)', padding: '3px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setResponsesTab('analytics')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: responsesTab === 'analytics' ? 'var(--accent-primary)' : 'transparent',
                      color: responsesTab === 'analytics' ? '#ffffff' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    📊 Question Breakdown
                  </button>

                  <button
                    type="button"
                    onClick={() => setResponsesTab('grid')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: responsesTab === 'grid' ? 'var(--accent-primary)' : 'transparent',
                      color: responsesTab === 'grid' ? '#ffffff' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    📋 Submissions Grid
                  </button>
                </div>
              </div>

              {/* Modal Body: Scrollable Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                {responsesData.loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px', gap: '10px' }}>
                    <Loader2 size={24} className="animate-spin" color="var(--accent-primary)" />
                    <span style={{ color: 'var(--text-secondary)' }}>Loading responses from database...</span>
                  </div>
                ) : responsesData.responses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <BarChart2 size={42} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      No Responses Recorded Yet
                    </h3>
                    <p style={{ fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 18px', lineHeight: 1.5 }}>
                      {responsesModalPres.type === 'survey'
                        ? 'Share the survey link with respondents to begin collecting feedback.'
                        : 'Launch the live presenter view and invite participants to vote.'}
                    </p>
                    {responsesModalPres.type === 'survey' && (
                      <button
                        type="button"
                        onClick={(e) => handleCopySurveyLink(responsesModalPres.code, e)}
                        className="btn-primary"
                        style={{ display: 'inline-flex', padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        <Share2 size={15} /> Copy Survey Share Link
                      </button>
                    )}
                  </div>
                ) : responsesTab === 'analytics' ? (
                  /* Question Breakdown / Charts Tab */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {responsesModalPres.questions.map((q, idx) => {
                      const qResponses = responsesData.responses.filter((r: any) => r.questionId === q.id);
                      const totalQ = qResponses.length;

                      return (
                        <div
                          key={q.id}
                          className="glass-panel"
                          style={{
                            padding: '20px 24px',
                            borderRadius: '14px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                                  Question {idx + 1}
                                </span>
                                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)' }}>
                                  {q.type.replace('_', ' ').toUpperCase()}
                                </span>
                                {q.required && <span style={{ color: '#ef4444', fontWeight: 700 }}>*</span>}
                              </div>
                              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, lineHeight: 1.35 }}>
                                {q.title}
                              </h4>
                            </div>

                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {totalQ} {totalQ === 1 ? 'response' : 'responses'}
                            </span>
                          </div>

                          {/* Charts / Visual Breakdown */}

                          {/* 1. MCQ & Multiple Choice */}
                          {(q.type === 'mcq' || q.type === 'multiple_choice') && q.options && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                              {q.options.map((opt) => {
                                let count = 0;
                                qResponses.forEach((r: any) => {
                                  if (q.type === 'mcq') {
                                    if (r.value === opt.id) count++;
                                  } else {
                                    try {
                                      const ids = JSON.parse(r.value);
                                      if (Array.isArray(ids) && ids.includes(opt.id)) count++;
                                    } catch {
                                      if (r.value === opt.id) count++;
                                    }
                                  }
                                });
                                const pct = totalQ > 0 ? Math.round((count / totalQ) * 100) : 0;

                                return (
                                  <div key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{opt.text}</span>
                                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                        {count} ({pct}%)
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        width: '100%',
                                        height: '8px',
                                        borderRadius: '9999px',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${pct}%`,
                                          height: '100%',
                                          borderRadius: '9999px',
                                          background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                                          transition: 'width 0.4s ease',
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 2. Rating Scale */}
                          {q.type === 'rating_scale' && (
                            <div style={{ marginTop: '12px' }}>
                              {(() => {
                                const min = q.minRating || 1;
                                const max = q.maxRating || 5;
                                const counts: Record<number, number> = {};
                                for (let i = min; i <= max; i++) counts[i] = 0;
                                let sum = 0;
                                qResponses.forEach((r: any) => {
                                  const val = parseInt(r.value, 10);
                                  if (!isNaN(val) && val >= min && val <= max) {
                                    counts[val] = (counts[val] || 0) + 1;
                                    sum += val;
                                  }
                                });
                                const avg = totalQ > 0 ? (sum / totalQ).toFixed(1) : '0';

                                return (
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                                      <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
                                        ★ {avg}
                                      </span>
                                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Average Rating out of {max}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      {Object.entries(counts).map(([score, c]) => (
                                        <div
                                          key={score}
                                          style={{
                                            flex: 1,
                                            minWidth: '50px',
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid var(--border-subtle)',
                                            textAlign: 'center',
                                          }}
                                        >
                                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                            {score}★
                                          </div>
                                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            {c}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* 3. True / False */}
                          {q.type === 'true_false' && (
                            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                              {(() => {
                                const trueCount = qResponses.filter((r: any) => r.value === 'true').length;
                                const falseCount = qResponses.filter((r: any) => r.value === 'false').length;
                                const truePct = totalQ > 0 ? Math.round((trueCount / totalQ) * 100) : 0;
                                const falsePct = totalQ > 0 ? Math.round((falseCount / totalQ) * 100) : 0;

                                return (
                                  <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                                      <span style={{ color: '#10b981', fontWeight: 700 }}>👍 True: {trueCount} ({truePct}%)</span>
                                      <span style={{ color: '#ef4444', fontWeight: 700 }}>👎 False: {falseCount} ({falsePct}%)</span>
                                    </div>
                                    <div style={{ width: '100%', height: '10px', borderRadius: '9999px', display: 'flex', overflow: 'hidden' }}>
                                      <div style={{ width: `${truePct}%`, background: '#10b981', transition: 'width 0.3s' }} />
                                      <div style={{ width: `${falsePct}%`, background: '#ef4444', transition: 'width 0.3s' }} />
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* 4. Short / Long Answer Feedback */}
                          {(q.type === 'short_answer' || q.type === 'long_answer') && (
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                              {qResponses.map((r: any) => (
                                <div
                                  key={r.id}
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid var(--border-subtle)',
                                    fontSize: '0.88rem',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    <span>{r.participantName || 'Anonymous'}</span>
                                    <span>{new Date(r.createdAt).toLocaleTimeString()}</span>
                                  </div>
                                  <div style={{ color: 'var(--text-primary)', lineHeight: 1.45 }}>
                                    {r.value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Submissions Grid (Google Sheets View) */
                  <div style={{ overflowX: 'auto' }}>
                    {(() => {
                      // Group responses by participantId
                      const userMap = new Map<string, any>();
                      responsesData.responses.forEach((r: any) => {
                        if (!userMap.has(r.participantId)) {
                          userMap.set(r.participantId, {
                            id: r.participantId,
                            name: r.participantName || 'Anonymous',
                            whatsapp: r.participantWhatsapp || 'N/A',
                            email: r.participantEmail || 'N/A',
                            submittedAt: r.createdAt,
                            answers: {},
                          });
                        }
                        userMap.get(r.participantId).answers[r.questionId] = r.value;
                      });

                      const rows = Array.from(userMap.values());

                      return (
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '0.84rem',
                            textAlign: 'left',
                          }}
                        >
                          <thead>
                            <tr style={{ background: 'rgba(255, 255, 255, 0.06)', borderBottom: '1px solid var(--border-strong)' }}>
                              <th style={{ padding: '10px 14px' }}>#</th>
                              <th style={{ padding: '10px 14px' }}>Timestamp</th>
                              <th style={{ padding: '10px 14px' }}>Respondent</th>
                              <th style={{ padding: '10px 14px' }}>WhatsApp</th>
                              <th style={{ padding: '10px 14px' }}>Email</th>
                              {responsesModalPres.questions.map((q, idx) => (
                                <th key={q.id} style={{ padding: '10px 14px', minWidth: '180px' }}>
                                  Q{idx + 1}: {q.title}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, rIdx) => (
                              <tr
                                key={row.id}
                                style={{
                                  borderBottom: '1px solid var(--border-subtle)',
                                  background: rIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                                }}
                              >
                                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{rIdx + 1}</td>
                                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                  {new Date(row.submittedAt).toLocaleDateString()} {new Date(row.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.name}</td>
                                <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{row.whatsapp}</td>
                                <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{row.email}</td>
                                {responsesModalPres.questions.map((q) => {
                                  const raw = row.answers[q.id];
                                  let display = raw || '-';
                                  if (q.options && raw) {
                                    if (q.type === 'mcq') {
                                      const matched = q.options.find((o) => o.id === raw);
                                      if (matched) display = matched.text;
                                    } else if (q.type === 'multiple_choice') {
                                      try {
                                        const ids = JSON.parse(raw);
                                        if (Array.isArray(ids)) {
                                          display = ids.map((id) => q.options?.find((o) => o.id === id)?.text || id).join(', ');
                                        }
                                      } catch {}
                                    }
                                  }
                                  return (
                                    <td key={q.id} style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>
                                      {display}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
