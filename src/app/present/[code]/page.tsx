'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import {
  fetchPresentation,
  fetchResponses,
  aggregateQuestionResults,
  updatePresentationState,
} from '@/lib/storage';
import { Presentation, ResponseSubmission, AggregatedResults } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import ChartBar from '@/components/ChartBar';
import InteractiveChart, { ChartOptionItem } from '@/components/InteractiveChart';
import WordCloud from '@/components/WordCloud';
import RatingMeter from '@/components/RatingMeter';
import QRCodeModal from '@/components/QRCodeModal';
import ThemeToggle from '@/components/ThemeToggle';
import confetti from 'canvas-confetti';
import {
  ChevronLeft,
  ChevronRight,
  QrCode,
  Users,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Download,
  Radio,
  RadioOff,
  Compass,
  Power,
  Settings,
  Sparkles,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react';

function PresenterLiveContent({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [responses, setResponses] = useState<ResponseSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [originUrl, setOriginUrl] = useState('');

  // 1. Initial Load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin.replace(/^https?:\/\//, ''));
    }

    async function loadData() {
      setLoading(true);
      const pres = await fetchPresentation(code);
      if (pres) {
        setPresentation(pres);
        const resps = await fetchResponses(pres.id, code);
        setResponses(resps);
      }
      setLoading(false);
    }
    loadData();
  }, [code]);

  // 2. Realtime WebSocket subscription & Fallback polling
  useEffect(() => {
    if (!presentation) return;

    const supabase = getSupabase();
    let supabaseChannel: any = null;

    if (isSupabaseConfigured && supabase) {
      supabaseChannel = supabase
        .channel(`present_channel_${code}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'responses', filter: `presentation_id=eq.${presentation.id}` },
          (payload: any) => {
            if (payload.eventType === 'DELETE' && payload.old) {
              setResponses((prev) => prev.filter((r) => r.id !== payload.old.id));
            } else if (payload.new) {
              const incoming: ResponseSubmission = {
                id: payload.new.id,
                presentationId: payload.new.presentation_id,
                questionId: payload.new.question_id,
                participantId: payload.new.participant_id,
                participantName: payload.new.participant_name,
                participantWhatsapp: payload.new.participant_whatsapp,
                participantEmail: payload.new.participant_email,
                value: payload.new.value,
                createdAt: payload.new.created_at,
              };

              setResponses((prev) => {
                const existingIdx = prev.findIndex((r) => r.id === incoming.id);
                if (existingIdx >= 0) {
                  const updated = [...prev];
                  updated[existingIdx] = incoming;
                  return updated;
                }
                return [...prev, incoming];
              });
            }
          }
        )
        .subscribe();
    }

    // Adaptive fallback polling (relaxed if WebSocket is connected, avoiding excessive re-renders)
    const pollIntervalTime = isSupabaseConfigured ? 3500 : 1500;
    const pollInterval = setInterval(async () => {
      try {
        const resps = await fetchResponses(presentation.id, code);
        setResponses((prev) => {
          // Avoid triggering re-renders if length and responses haven't changed
          if (prev.length === resps.length) {
            let changed = false;
            for (let i = 0; i < prev.length; i++) {
              if (prev[i].id !== resps[i].id || prev[i].value !== resps[i].value) {
                changed = true;
                break;
              }
            }
            if (!changed) return prev;
          }
          return resps;
        });
      } catch {}
    }, pollIntervalTime);

    return () => {
      if (supabaseChannel && supabase) supabase.removeChannel(supabaseChannel);
      clearInterval(pollInterval);
    };
  }, [code, presentation?.id]);

  // 3. Navigation & Actions
  const currentQuestion = presentation?.questions?.[presentation?.currentQuestionIndex ?? 0];
  const aggregated: AggregatedResults | null = currentQuestion
    ? aggregateQuestionResults(currentQuestion, responses)
    : null;

  const handleNextSlide = async () => {
    if (!presentation) return;
    if (presentation.currentQuestionIndex < presentation.questions.length - 1) {
      const nextIndex = presentation.currentQuestionIndex + 1;
      setPresentation((prev) => (prev ? { ...prev, currentQuestionIndex: nextIndex } : null));
      await updatePresentationState(code, { currentQuestionIndex: nextIndex });
    }
  };

  const handlePrevSlide = async () => {
    if (!presentation) return;
    if (presentation.currentQuestionIndex > 0) {
      const prevIndex = presentation.currentQuestionIndex - 1;
      setPresentation((prev) => (prev ? { ...prev, currentQuestionIndex: prevIndex } : null));
      await updatePresentationState(code, { currentQuestionIndex: prevIndex });
    }
  };

  const handleToggleLock = async () => {
    if (!presentation) return;
    const newLock = !presentation.isLocked;
    setPresentation((prev) => (prev ? { ...prev, isLocked: newLock } : null));
    await updatePresentationState(code, { isLocked: newLock });
  };

  const handleToggleSessionLive = async () => {
    if (!presentation) return;
    const newLive = !presentation.isLive;
    setPresentation((prev) => (prev ? { ...prev, isLive: newLive } : null));
    await updatePresentationState(code, { isLive: newLive });
  };

  const handleToggleForwardLock = async () => {
    if (!presentation) return;
    const newLock = !presentation.lockForwardSlides;
    setPresentation((prev) => (prev ? { ...prev, lockForwardSlides: newLock } : null));
    await updatePresentationState(code, { lockForwardSlides: newLock });
  };

  const handleToggleResults = async () => {
    if (!presentation) return;
    const newShow = !presentation.showResults;
    setPresentation((prev) => (prev ? { ...prev, showResults: newShow } : null));
    await updatePresentationState(code, { showResults: newShow });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 'q') {
        setIsQrOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'l') {
        handleToggleLock();
      } else if (e.key.toLowerCase() === 'c') {
        // Trigger celebratory confetti
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <div style={{ width: '40px', height: '40px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading presentation {code}...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', maxWidth: '440px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Room Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            No presentation matching code <strong>{code}</strong>.
          </p>
          <a href="/admin" className="btn-primary" style={{ width: '100%' }}>
            Go to Presentation Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '28px 40px',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* 1. Top Presentation Header / Join Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Join Instructions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Join at
            </span>
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '4px 12px',
                borderRadius: '8px',
              }}
            >
              {originUrl ? `${originUrl}/join` : 'audience-meter/join'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Code:
            </span>
            <span className="code-pill" style={{ fontSize: '1.4rem', padding: '4px 14px' }}>
              {code}
            </span>
          </div>

          <button
            onClick={() => setIsQrOpen(true)}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <QrCode size={16} /> Show QR Code
          </button>
        </div>

        {/* Live Counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <Radio size={14} className="pulse-dot" /> Live
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '9999px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              fontSize: '0.95rem',
              fontWeight: 700,
            }}
          >
            <Users size={16} />
            <span>{aggregated?.totalResponses ?? 0}</span>
            <span style={{ fontWeight: 400, fontSize: '0.8rem', opacity: 0.8 }}>responses</span>
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* 2. Main Question Display Area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: '1040px',
          width: '100%',
          margin: '0 auto',
          padding: '40px 0 90px 0',
        }}
      >
        {currentQuestion ? (
          <div>
            {/* Slide Question Title */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <div
                style={{
                  display: 'inline-block',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  marginBottom: '12px',
                }}
              >
                {currentQuestion.type.replace('_', ' ')} • Slide {presentation.currentQuestionIndex + 1} of {presentation.questions.length}
              </div>

              <h1
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  color: 'var(--text-primary)',
                  maxWidth: '900px',
                  margin: '0 auto',
                }}
              >
                {currentQuestion.title}
              </h1>

              {currentQuestion.description && (
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                  {currentQuestion.description}
                </p>
              )}

              {currentQuestion.guidance && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '12px',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    fontSize: '0.85rem',
                    color: '#818cf8',
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={14} color="#818cf8" /> Facilitator Tip: {currentQuestion.guidance}
                </div>
              )}
            </div>

            {/* Results Presentation Area */}
            {!presentation.showResults ? (
              <div
                className="glass-panel"
                style={{
                  padding: '60px 40px',
                  textAlign: 'center',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <EyeOff size={48} color="#94a3b8" style={{ marginBottom: '16px', opacity: 0.6 }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
                  Results Hidden
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '440px', margin: '0 auto' }}>
                  Audience responses are being collected in the background. Press &apos;Show Results&apos; or press &apos;R&apos; to reveal them.
                </p>
              </div>
            ) : (
              <div>
                {/* A. Single Choice & Multiple Choice Poll Bars */}
                {(currentQuestion.type === 'mcq' || currentQuestion.type === 'multiple_choice') && (
                  <InteractiveChart
                    options={
                      currentQuestion.options?.map((opt, idx) => ({
                        id: opt.id,
                        label: String.fromCharCode(65 + idx),
                        text: opt.text,
                        count: aggregated?.optionCounts?.[opt.id] ?? 0,
                        isCorrect: opt.isCorrect,
                      })) ?? []
                    }
                    totalVotes={aggregated?.totalResponses ?? 0}
                  />
                )}

                {/* B. Short Answer - Dynamic Word Cloud */}
                {currentQuestion.type === 'short_answer' && (
                  <WordCloud
                    words={aggregated?.wordCloud ?? []}
                    totalResponses={aggregated?.totalResponses ?? 0}
                  />
                )}

                {/* C. True / False Split */}
                {currentQuestion.type === 'true_false' && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '24px',
                    }}
                  >
                    {/* True Card */}
                    <div
                      className="glass-panel"
                      style={{
                        padding: '36px',
                        textAlign: 'center',
                        border: '2px solid rgba(16, 185, 129, 0.4)',
                        background: 'rgba(16, 185, 129, 0.08)',
                      }}
                    >
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>
                        TRUE
                      </div>
                      <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {aggregated?.totalResponses
                          ? Math.round(
                              ((aggregated.trueFalseCounts?.trueCount ?? 0) /
                                aggregated.totalResponses) *
                                100
                            )
                          : 0}
                        %
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        {aggregated?.trueFalseCounts?.trueCount ?? 0} votes
                      </div>
                    </div>

                    {/* False Card */}
                    <div
                      className="glass-panel"
                      style={{
                        padding: '36px',
                        textAlign: 'center',
                        border: '2px solid rgba(239, 68, 68, 0.4)',
                        background: 'rgba(239, 68, 68, 0.08)',
                      }}
                    >
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f87171', marginBottom: '8px' }}>
                        FALSE
                      </div>
                      <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {aggregated?.totalResponses
                          ? Math.round(
                              ((aggregated.trueFalseCounts?.falseCount ?? 0) /
                                aggregated.totalResponses) *
                                100
                            )
                          : 0}
                        %
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        {aggregated?.trueFalseCounts?.falseCount ?? 0} votes
                      </div>
                    </div>
                  </div>
                )}

                {/* D. Rating Scale */}
                {currentQuestion.type === 'rating_scale' && (
                  <RatingMeter
                    average={aggregated?.ratingAverage ?? 0}
                    totalVotes={aggregated?.totalResponses ?? 0}
                    ratingCounts={aggregated?.ratingCounts ?? {}}
                    minRating={currentQuestion.minRating}
                    maxRating={currentQuestion.maxRating}
                  />
                )}

                {/* E. Long Answer / Open Q&A stream */}
                {currentQuestion.type === 'long_answer' && (
                  <div>
                    {!aggregated?.textResponses || aggregated.textResponses.length === 0 ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '50px 20px',
                          color: 'var(--text-muted)',
                          border: '2px dashed var(--border-subtle)',
                          borderRadius: 'var(--radius-lg)',
                        }}
                      >
                        <MessageSquare size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <p style={{ fontSize: '1.1rem' }}>Waiting for audience comments...</p>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                          gap: '16px',
                          maxHeight: '480px',
                          overflowY: 'auto',
                          padding: '8px',
                        }}
                      >
                        {aggregated.textResponses.map((item) => (
                          <div
                            key={item.id}
                            className="glass-panel"
                            style={{
                              padding: '20px',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <p style={{ fontSize: '1.05rem', color: '#f8fafc', lineHeight: 1.45, marginBottom: '12px' }}>
                              &ldquo;{item.text}&rdquo;
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <span style={{ fontWeight: 600, color: '#a5b4fc' }}>{item.name}</span>
                              <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            No questions in this presentation.
          </div>
        )}
      </main>

      {/* 3. Floating Host Controls Bar */}
      <footer className="host-toolbar">
        {/* Prev Slide */}
        <button
          onClick={handlePrevSlide}
          disabled={presentation.currentQuestionIndex === 0}
          title="Previous Slide (Left Arrow)"
          style={{
            padding: '8px',
            color: presentation.currentQuestionIndex === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
          }}
        >
          <ChevronLeft size={22} />
        </button>

        {/* Slide Counter */}
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 4px' }}>
          {presentation.currentQuestionIndex + 1} / {presentation.questions.length}
        </span>

        {/* Next Slide */}
        <button
          onClick={handleNextSlide}
          disabled={presentation.currentQuestionIndex === presentation.questions.length - 1}
          title="Next Slide (Right Arrow or Space)"
          style={{
            padding: '8px',
            color:
              presentation.currentQuestionIndex === presentation.questions.length - 1
                ? 'var(--text-muted)'
                : 'var(--text-primary)',
          }}
        >
          <ChevronRight size={22} />
        </button>

        <div style={{ width: '1px', height: '20px', background: 'var(--border-strong)', margin: '0 4px' }} />

        {/* Live Session Open / Close Toggle */}
        <button
          onClick={handleToggleSessionLive}
          title={
            presentation.isLive
              ? 'Session is LIVE (Accepting participant votes). Click to Close Session.'
              : 'Session is CLOSED (Submissions blocked). Click to Reopen Session.'
          }
          style={{
            padding: '8px',
            color: presentation.isLive ? '#10b981' : '#f87171',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {presentation.isLive ? <Radio size={18} /> : <RadioOff size={18} />}
        </button>

        {/* Free Navigation vs Host-Paced Toggle */}
        <button
          onClick={handleToggleForwardLock}
          title={
            presentation.lockForwardSlides
              ? 'Forward Navigation LOCKED (Participants cannot advance past presenter). Click to allow free navigation.'
              : 'Free Navigation ENABLED (Participants can move to any slide independently). Click to lock forward slides.'
          }
          style={{
            padding: '8px',
            color: presentation.lockForwardSlides ? '#f59e0b' : '#818cf8',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <Compass size={18} />
        </button>

        {/* Lock/Unlock Toggle */}
        <button
          onClick={handleToggleLock}
          title={presentation.isLocked ? 'Voting Locked (Click to Unlock Voting)' : 'Voting Active (Click to Pause/Lock Voting)'}
          style={{
            padding: '8px',
            color: presentation.isLocked ? '#f87171' : 'var(--text-secondary)',
          }}
        >
          {presentation.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
        </button>

        {/* Show/Hide Results */}
        <button
          onClick={handleToggleResults}
          title={presentation.showResults ? 'Hide Results from Screen' : 'Show Results on Screen'}
          style={{
            padding: '8px',
            color: presentation.showResults ? '#818cf8' : 'var(--text-muted)',
          }}
        >
          {presentation.showResults ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>

        {/* Confetti Celebration */}
        <button
          onClick={() => confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } })}
          title="Celebration Confetti (Key C)"
          style={{ padding: '8px', color: '#fbbf24' }}
        >
          <Sparkles size={18} />
        </button>

        {/* Excel (.xlsx) Export Button */}
        <a
          href={`/api/export-xlsx/${code}`}
          download
          title="Download Participants & Responses in Excel (.xlsx)"
          style={{ padding: '8px', color: '#10b981', display: 'inline-flex' }}
        >
          <FileSpreadsheet size={18} />
        </a>

        {/* CSV Export Button */}
        <a
          href={`/api/export/${code}`}
          download
          title="Export Attendee Responses to CSV"
          style={{ padding: '8px', color: 'var(--text-secondary)', display: 'inline-flex' }}
        >
          <Download size={18} />
        </a>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen (Key F)"
          style={{ padding: '8px', color: 'var(--text-secondary)' }}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </footer>

      {/* QR Code Presentation Modal */}
      <QRCodeModal isOpen={isQrOpen} onClose={() => setIsQrOpen(false)} roomCode={code} />
    </div>
  );
}

export default function PresenterLiveView({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading presentation...</p>
        </div>
      }
    >
      <PresenterLiveContent params={params} />
    </Suspense>
  );
}
