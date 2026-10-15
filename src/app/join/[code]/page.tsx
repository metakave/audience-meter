'use client';

import React, { useEffect, useState, use, Suspense, useCallback } from 'react';
import {
  fetchPresentation,
  getLocalParticipant,
  saveLocalParticipant,
  registerParticipant,
  submitResponse,
} from '@/lib/storage';
import { Presentation, Participant, ResponseSubmission, Question } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  CheckCircle2,
  Lock,
  Unlock,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  Send,
  Sparkles,
  RefreshCw,
  Edit2,
  Radio,
  RadioOff,
  Compass,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

function ParticipantJoinContent({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const [loading, setLoading] = useState(true);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);

  // Self-Paced Navigation state
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [userNavigatedManually, setUserNavigatedManually] = useState<boolean>(false);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<string>>(new Set());

  // Registration Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [registering, setRegistering] = useState(false);
  const [formError, setFormError] = useState('');

  // Active voting state for current question
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedMultiple, setSelectedMultiple] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [ratingAnswer, setRatingAnswer] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedForQuestionId, setSubmittedForQuestionId] = useState<string | null>(null);
  const [submittedValue, setSubmittedValue] = useState<string>('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // 1. Initial Load & Participant Profile Restoration
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const pres = await fetchPresentation(code);
      setPresentation(pres);

      const saved = getLocalParticipant();
      if (saved && saved.firstName && saved.whatsapp) {
        setFirstName(saved.firstName);
        setLastName(saved.lastName || '');
        setWhatsapp(saved.whatsapp);
        setEmail(saved.email || '');

        if (pres) {
          const participantId = `${code}_${saved.whatsapp.replace(/\D/g, '')}`;
          const currentParticipant: Participant = {
            id: participantId,
            presentationId: pres.id,
            roomCode: code,
            firstName: saved.firstName,
            lastName: saved.lastName || '',
            whatsapp: saved.whatsapp,
            email: saved.email || '',
            joinedAt: new Date().toISOString(),
          };
          setParticipant(currentParticipant);
          registerParticipant(currentParticipant);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [code]);

  // Synchronize initial question index if user hasn't manually chosen a question
  useEffect(() => {
    if (presentation && !userNavigatedManually) {
      const idx = typeof presentation.currentQuestionIndex === 'number' ? presentation.currentQuestionIndex : 0;
      setActiveSlideIndex(idx);
    }
  }, [presentation?.currentQuestionIndex, userNavigatedManually]);

  // Scan local cache to discover all previously answered questions
  const refreshAnsweredCache = useCallback(() => {
    if (!presentation || !participant) return;
    const answered = new Set<string>();
    presentation.questions.forEach((q) => {
      const cacheKey = `audiencemeter_ans_${code}_${participant.id}_${q.id}`;
      try {
        const val = sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey);
        if (val) answered.add(q.id);
      } catch {}
    });
    setAnsweredQuestionIds(answered);
  }, [presentation, participant, code]);

  useEffect(() => {
    refreshAnsweredCache();
  }, [refreshAnsweredCache, activeSlideIndex]);

  // 2. Real-time Subscription & Anti-Timeout Reconnection Engine (>1 Hour Resilience)
  useEffect(() => {
    if (!presentation) return;

    const supabase = getSupabase();
    let supabaseChannel: any = null;

    const initSubscription = () => {
      if (isSupabaseConfigured && supabase) {
        try {
          if (supabaseChannel) {
            supabase.removeChannel(supabaseChannel);
          }
          supabaseChannel = supabase
            .channel(`pres_${code}_${Date.now()}`)
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'presentations', filter: `code=eq.${code}` },
              (payload: any) => {
                if (payload.new) {
                  setPresentation((prev) =>
                    prev
                      ? {
                          ...prev,
                          currentQuestionIndex: payload.new.current_question_index,
                          isLocked: payload.new.is_locked,
                          isLive: typeof payload.new.is_live === 'boolean' ? payload.new.is_live : prev.isLive,
                          lockForwardSlides:
                            typeof payload.new.lock_forward_slides === 'boolean'
                              ? payload.new.lock_forward_slides
                              : prev.lockForwardSlides,
                          showResults: payload.new.show_results,
                        }
                      : null
                  );
                }
              }
            )
            .subscribe((status: string) => {
              // Automatically reconnect on websocket drop, token expiry, or network blip
              if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                setTimeout(initSubscription, 2000);
              }
            });
        } catch (e) {
          console.warn('Supabase subscribe error:', e);
        }
      }
    };

    initSubscription();

    // Secondary HTTP Polling Heartbeat (Guarantees infinite connection without timeouts)
    const pollIntervalTime = 3800;
    const pollInterval = setInterval(async () => {
      try {
        const pres = await fetchPresentation(code);
        if (pres) {
          setPresentation((prev) => {
            if (
              !prev ||
              prev.currentQuestionIndex !== pres.currentQuestionIndex ||
              prev.isLocked !== pres.isLocked ||
              prev.isLive !== pres.isLive ||
              prev.lockForwardSlides !== pres.lockForwardSlides ||
              prev.showResults !== pres.showResults
            ) {
              return pres;
            }
            return prev;
          });
        }
      } catch {}
    }, pollIntervalTime);

    // Visibility & Wakeup handler: Restores connection immediately when phone wakes up after hours
    const handleVisibilityOrWakeup = async () => {
      if (document.visibilityState === 'visible') {
        try {
          initSubscription();
          const pres = await fetchPresentation(code);
          if (pres) setPresentation(pres);
        } catch {}
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrWakeup);
    window.addEventListener('focus', handleVisibilityOrWakeup);
    window.addEventListener('online', handleVisibilityOrWakeup);

    return () => {
      if (supabaseChannel && supabase) supabase.removeChannel(supabaseChannel);
      clearInterval(pollInterval);
      window.removeEventListener('visibilitychange', handleVisibilityOrWakeup);
      window.removeEventListener('focus', handleVisibilityOrWakeup);
      window.removeEventListener('online', handleVisibilityOrWakeup);
    };
  }, [code, presentation?.id]);

  // Current Question is determined by the participant's independent slide index
  const totalQuestions = presentation?.questions?.length || 0;
  const safeIndex = Math.max(0, Math.min(activeSlideIndex, totalQuestions - 1));
  const currentQuestion: Question | undefined = presentation?.questions?.[safeIndex];

  // Forward Navigation lock check
  const isForwardLocked = Boolean(
    presentation?.lockForwardSlides &&
      typeof presentation?.currentQuestionIndex === 'number' &&
      safeIndex >= presentation.currentQuestionIndex
  );

  // 3. Clear or restore answer when participant moves to a question
  useEffect(() => {
    if (!currentQuestion || !participant) return;

    const cacheKey = `audiencemeter_ans_${code}_${participant.id}_${currentQuestion.id}`;
    let cachedVal: string | null = null;
    try {
      cachedVal = sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey);
    } catch {}

    if (cachedVal) {
      setSubmittedForQuestionId(currentQuestion.id);
      setSubmittedValue(cachedVal);
      if (currentQuestion.type === 'mcq' || currentQuestion.type === 'true_false') {
        setSelectedOption(cachedVal);
      } else if (currentQuestion.type === 'multiple_choice') {
        try {
          setSelectedMultiple(JSON.parse(cachedVal));
        } catch {
          setSelectedMultiple([cachedVal]);
        }
      } else if (currentQuestion.type === 'rating_scale') {
        setRatingAnswer(parseInt(cachedVal, 10) || 0);
      } else {
        setTextAnswer(cachedVal);
      }
    } else {
      setSubmittedForQuestionId(null);
      setSubmittedValue('');
      setSelectedOption('');
      setSelectedMultiple([]);
      setTextAnswer('');
      setRatingAnswer(0);
    }
  }, [currentQuestion?.id, participant?.id, code, safeIndex]);

  // Handle Participant Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !whatsapp.trim() || !email.trim()) {
      setFormError('Please fill in First Name, WhatsApp number, and Email.');
      return;
    }
    setFormError('');
    setRegistering(true);

    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim().toLowerCase(),
    };
    saveLocalParticipant(profile);

    const participantId = `${code}_${profile.whatsapp.replace(/\D/g, '')}_${Date.now()}`;
    const newParticipant: Participant = {
      id: participantId,
      presentationId: presentation?.id || 'demo',
      roomCode: code,
      ...profile,
      joinedAt: new Date().toISOString(),
    };

    await registerParticipant(newParticipant);
    setParticipant(newParticipant);
    setIsEditingProfile(false);
    setRegistering(false);
  };

  // Handle Response Submission
  const handleSubmitAnswer = async (customValue?: string) => {
    if (!participant || !presentation || !currentQuestion) return;
    // Session closure and lock checks
    if (!presentation.isLive) return;
    if (presentation.isLocked || currentQuestion.isLocked) return;

    let valueToSubmit = customValue;
    if (valueToSubmit === undefined) {
      if (currentQuestion.type === 'mcq' || currentQuestion.type === 'true_false') {
        valueToSubmit = selectedOption;
      } else if (currentQuestion.type === 'multiple_choice') {
        valueToSubmit = JSON.stringify(selectedMultiple);
      } else if (currentQuestion.type === 'rating_scale') {
        valueToSubmit = ratingAnswer.toString();
      } else {
        valueToSubmit = textAnswer.trim();
      }
    }

    if (!valueToSubmit) return;

    setIsSubmitting(true);
    // Optimistic UI update
    setSubmittedForQuestionId(currentQuestion.id);
    setSubmittedValue(valueToSubmit);

    // Cache answer locally
    const cacheKey = `audiencemeter_ans_${code}_${participant.id}_${currentQuestion.id}`;
    try {
      sessionStorage.setItem(cacheKey, valueToSubmit);
      localStorage.setItem(cacheKey, valueToSubmit);
    } catch {}

    setAnsweredQuestionIds((prev) => new Set(prev).add(currentQuestion.id));

    const submission: ResponseSubmission = {
      id: `${participant.id}_${currentQuestion.id}`,
      presentationId: presentation.id,
      questionId: currentQuestion.id,
      participantId: participant.id,
      participantName: `${participant.firstName} ${participant.lastName}`.trim(),
      participantWhatsapp: participant.whatsapp,
      participantEmail: participant.email,
      value: valueToSubmit,
      createdAt: new Date().toISOString(),
    };

    try {
      await submitResponse(submission, code);
    } catch (err) {
      console.warn('Response submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExclusiveOption = (text: string) => {
    const t = text.toLowerCase();
    return (
      t.includes('none') ||
      t.includes('haven’t used ai') ||
      t.includes('havent used ai') ||
      t.includes("haven't used ai") ||
      t.includes('still exploring')
    );
  };

  const toggleMultiple = (optId: string) => {
    const clickedOpt = currentQuestion?.options?.find((o) => o.id === optId);
    if (!clickedOpt) return;

    const isClickedExclusive = isExclusiveOption(clickedOpt.text);

    setSelectedMultiple((prev) => {
      if (prev.includes(optId)) {
        return prev.filter((id) => id !== optId);
      }

      if (isClickedExclusive) {
        return [optId];
      }

      const filtered = prev.filter((id) => {
        const o = currentQuestion?.options?.find((opt) => opt.id === id);
        return o ? !isExclusiveOption(o.text) : true;
      });

      const maxLimit = currentQuestion?.maxSelections || 3;
      if (filtered.length >= maxLimit) {
        return [...filtered.slice(1), optId];
      }

      return [...filtered, optId];
    });
  };

  // Navigation handlers
  const handleNextSlide = () => {
    if (safeIndex < totalQuestions - 1 && !isForwardLocked) {
      setUserNavigatedManually(true);
      setActiveSlideIndex(safeIndex + 1);
    }
  };

  const handlePrevSlide = () => {
    if (safeIndex > 0) {
      setUserNavigatedManually(true);
      setActiveSlideIndex(safeIndex - 1);
    }
  };

  const handleJumpToSlide = (index: number) => {
    if (presentation?.lockForwardSlides && index > (presentation.currentQuestionIndex || 0)) {
      return;
    }
    setUserNavigatedManually(true);
    setActiveSlideIndex(index);
  };

  const handleJumpToHost = () => {
    if (presentation && typeof presentation.currentQuestionIndex === 'number') {
      setUserNavigatedManually(false);
      setActiveSlideIndex(presentation.currentQuestionIndex);
    }
  };

  // Loading state
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
        <div
          style={{
            width: '38px',
            height: '38px',
            border: '3px solid #6366f1',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: 'var(--text-secondary)' }}>Connecting to session {code}...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Presentation not found
  if (!presentation) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div className="glass-panel" style={{ padding: '36px 24px', maxWidth: '420px', width: '100%' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Presentation Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
            Room code <strong>{code}</strong> does not exist or may have been deleted.
          </p>
          <a href="/join" className="btn-primary" style={{ display: 'inline-block', width: '100%' }}>
            Try Another Code
          </a>
        </div>
      </div>
    );
  }

  // 1. Participant Registration Modal / Screen
  if (!participant || isEditingProfile) {
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
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <ThemeToggle />
        </div>

        <div
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '440px',
            padding: '36px 28px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--accent-primary)',
                background: 'rgba(99, 102, 241, 0.12)',
                padding: '4px 12px',
                borderRadius: '9999px',
                letterSpacing: '1px',
              }}
            >
              PIN: {code}
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '12px', marginBottom: '6px' }}>
              {isEditingProfile ? 'Update Profile' : 'Join Audience'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              {presentation.title}
            </p>
          </div>

          {formError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '18px',
              }}
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                First Name *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Alex"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 38px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                  }}
                />
                <User size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Last Name (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Taylor"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 38px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                  }}
                />
                <User size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                WhatsApp Mobile Number *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="e.g. +880 1712 345678"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 38px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                  }}
                />
                <Phone size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sadiq@example.com"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 38px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                  }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={registering}
              className="btn-primary"
              style={{ width: '100%', marginTop: '10px', padding: '14px', fontSize: '1rem' }}
            >
              {registering ? 'Joining...' : 'Join & Start Interacting'} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Session Closed Check (Admin explicitly closed session)
  const isSessionClosed = presentation.isLive === false;
  if (isSessionClosed) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          maxWidth: '520px',
          margin: '0 auto',
        }}
      >
        <div
          className="glass-panel"
          style={{
            width: '100%',
            padding: '40px 28px',
            textAlign: 'center',
            borderRadius: '18px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <RadioOff size={30} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
            Session Closed by Host
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '24px' }}>
            This live presentation session is currently closed. Submissions are no longer being accepted.
          </p>

          <div
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.88rem',
              color: 'var(--text-primary)',
            }}
          >
            Thank you for participating, <strong>{participant.firstName}</strong>!
            {answeredQuestionIds.size > 0 && (
              <div style={{ marginTop: '6px', fontSize: '0.82rem', color: '#10b981' }}>
                ✓ You recorded answers for {answeredQuestionIds.size} of {totalQuestions} questions.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Main Live Participant Voting Interface
  const isAnswered = currentQuestion ? answeredQuestionIds.has(currentQuestion.id) : false;
  const isLocked = Boolean(presentation.isLocked || currentQuestion?.isLocked);
  const hostIsOnDifferentSlide =
    typeof presentation.currentQuestionIndex === 'number' &&
    presentation.currentQuestionIndex !== safeIndex;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px',
        maxWidth: '560px',
        margin: '0 auto',
      }}
    >
      {/* Top Participant Bar */}
      <header
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-subtle)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
            }}
          >
            {participant.firstName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {participant.firstName} {participant.lastName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Pin:</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  letterSpacing: '0.5px',
                }}
              >
                {code}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ThemeToggle compact={true} />
          <button
            onClick={() => setIsEditingProfile(true)}
            title="Edit profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-strong)',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Edit2 size={13} color="var(--accent-primary)" /> Edit
          </button>
        </div>
      </header>

      {/* Host Position Alert Banner (If Host is presenting a different slide) */}
      {hostIsOnDifferentSlide && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            marginBottom: '16px',
            fontSize: '0.82rem',
            color: 'var(--text-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem' }}>📍</span>
            <span>Host is presenting <strong>Slide {(presentation.currentQuestionIndex || 0) + 1}</strong></span>
          </div>
          <button
            type="button"
            onClick={handleJumpToHost}
            style={{
              background: 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            Jump to Host
          </button>
        </div>
      )}

      {/* Main Question Card with Self-Paced Navigation */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: '20px' }}>
        {currentQuestion ? (
          <div
            className="glass-panel"
            style={{
              padding: '24px 20px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Slide Navigation Header with Arrows & Jump Indicators */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {/* Previous Button */}
              <button
                type="button"
                onClick={handlePrevSlide}
                disabled={safeIndex === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: safeIndex === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: safeIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: safeIndex === 0 ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                <ChevronLeft size={16} /> Back
              </button>

              {/* Current Question Badge */}
              <div style={{ textAlign: 'center' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                    letterSpacing: '0.5px',
                  }}
                >
                  Question {safeIndex + 1} of {totalQuestions}
                </span>
                {isLocked && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem',
                      color: '#f87171',
                      marginLeft: '6px',
                      fontWeight: 600,
                    }}
                  >
                    <Lock size={10} /> Locked
                  </div>
                )}
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNextSlide}
                disabled={safeIndex >= totalQuestions - 1 || isForwardLocked}
                title={isForwardLocked ? 'Host has locked forward slides' : 'Next slide'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: isForwardLocked ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)',
                  border: `1px solid ${isForwardLocked ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)'}`,
                  color:
                    safeIndex >= totalQuestions - 1 || isForwardLocked
                      ? 'var(--text-muted)'
                      : 'var(--text-primary)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: safeIndex >= totalQuestions - 1 || isForwardLocked ? 'not-allowed' : 'pointer',
                  opacity: safeIndex >= totalQuestions - 1 ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {isForwardLocked ? (
                  <>
                    <Lock size={13} color="#f87171" /> Locked
                  </>
                ) : (
                  <>
                    Next <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>

            {/* Quick Question Jump Strip */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '16px',
              }}
            >
              {presentation.questions.map((q, idx) => {
                const isActive = idx === safeIndex;
                const isQAnswered = answeredQuestionIds.has(q.id);
                const isQForwardLocked = Boolean(
                  presentation.lockForwardSlides &&
                    typeof presentation.currentQuestionIndex === 'number' &&
                    idx > presentation.currentQuestionIndex
                );

                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={isQForwardLocked}
                    onClick={() => handleJumpToSlide(idx)}
                    title={
                      isQForwardLocked
                        ? `Slide ${idx + 1} locked by host`
                        : `Jump to Slide ${idx + 1} ${isQAnswered ? '(Answered)' : ''}`
                    }
                    style={{
                      flexShrink: 0,
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: isActive
                        ? '2px solid var(--accent-primary)'
                        : isQAnswered
                        ? '1px solid rgba(16, 185, 129, 0.5)'
                        : '1px solid var(--border-subtle)',
                      background: isActive
                        ? 'var(--accent-primary)'
                        : isQAnswered
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(255, 255, 255, 0.04)',
                      color: isActive
                        ? '#ffffff'
                        : isQAnswered
                        ? '#10b981'
                        : isQForwardLocked
                        ? 'var(--text-muted)'
                        : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isQForwardLocked ? 'not-allowed' : 'pointer',
                      opacity: isQForwardLocked ? 0.35 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isQAnswered && !isActive ? '✓' : idx + 1}
                  </button>
                );
              })}
            </div>

            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.35,
                marginBottom: currentQuestion.description ? '8px' : '18px',
              }}
            >
              {currentQuestion.title}
            </h2>

            {currentQuestion.description && (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                {currentQuestion.description}
              </p>
            )}

            {/* Answered Banner with Next Slide Button */}
            {isAnswered && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  color: '#34d399',
                  marginBottom: '18px',
                  fontSize: '0.88rem',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Response recorded!</strong>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      You can change your response below or move to the next slide.
                    </div>
                  </div>
                </div>

                {safeIndex < totalQuestions - 1 && !isForwardLocked && (
                  <button
                    type="button"
                    onClick={handleNextSlide}
                    className="btn-primary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Next Slide <ChevronRight size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Voting Paused / Locked Banner */}
            {isLocked && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '10px',
                  color: '#f87171',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                }}
              >
                <Lock size={16} />
                <span>Voting is currently paused by the host. You can still navigate and read slides.</span>
              </div>
            )}

            {/* A. Single Choice MCQ */}
            {currentQuestion.type === 'mcq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentQuestion.options?.map((opt, idx) => {
                  const isSelected = selectedOption === opt.id;
                  const letter = String.fromCharCode(65 + idx);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isLocked || isSubmitting}
                      onClick={() => {
                        setSelectedOption(opt.id);
                        handleSubmitAnswer(opt.id);
                      }}
                      className={`option-select-btn ${isSelected ? 'selected' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                            color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                          }}
                        >
                          {letter}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      {isSelected && <CheckCircle2 size={18} color="#818cf8" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* B. Multiple Choice */}
            {currentQuestion.type === 'multiple_choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentQuestion.options?.map((opt) => {
                  const isSelected = selectedMultiple.includes(opt.id);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isLocked || isSubmitting}
                      onClick={() => toggleMultiple(opt.id)}
                      className={`option-select-btn ${isSelected ? 'selected' : ''}`}
                    >
                      <span>{opt.text}</span>
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          border: `2px solid ${isSelected ? '#6366f1' : 'var(--border-strong)'}`,
                          background: isSelected ? '#6366f1' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected && <CheckCircle2 size={16} color="#ffffff" />}
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={isLocked || isSubmitting || selectedMultiple.length === 0}
                  onClick={() => handleSubmitAnswer()}
                  className="btn-primary"
                  style={{ marginTop: '10px', padding: '12px', fontSize: '0.95rem' }}
                >
                  {isSubmitting ? 'Submitting...' : `Submit ${selectedMultiple.length} Selected`}
                </button>
              </div>
            )}

            {/* C. True / False */}
            {currentQuestion.type === 'true_false' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  disabled={isLocked || isSubmitting}
                  onClick={() => {
                    setSelectedOption('true');
                    handleSubmitAnswer('true');
                  }}
                  className={`option-select-btn ${selectedOption === 'true' ? 'selected' : ''}`}
                  style={{
                    flexDirection: 'column',
                    padding: '20px 14px',
                    textAlign: 'center',
                    justifyContent: 'center',
                    borderColor: selectedOption === 'true' ? '#10b981' : undefined,
                    background: selectedOption === 'true' ? 'rgba(16, 185, 129, 0.15)' : undefined,
                  }}
                >
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>TRUE</span>
                </button>

                <button
                  type="button"
                  disabled={isLocked || isSubmitting}
                  onClick={() => {
                    setSelectedOption('false');
                    handleSubmitAnswer('false');
                  }}
                  className={`option-select-btn ${selectedOption === 'false' ? 'selected' : ''}`}
                  style={{
                    flexDirection: 'column',
                    padding: '20px 14px',
                    textAlign: 'center',
                    justifyContent: 'center',
                    borderColor: selectedOption === 'false' ? '#ef4444' : undefined,
                    background: selectedOption === 'false' ? 'rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                >
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171' }}>FALSE</span>
                </button>
              </div>
            )}

            {/* D. Short Answer (Word Cloud) */}
            {currentQuestion.type === 'short_answer' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitAnswer();
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <input
                  type="text"
                  maxLength={30}
                  disabled={isLocked || isSubmitting}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Enter word or short phrase..."
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'var(--bg-tertiary)',
                    border: '2px solid var(--border-subtle)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={isLocked || isSubmitting || !textAnswer.trim()}
                  className="btn-primary"
                  style={{ padding: '12px', fontSize: '0.95rem' }}
                >
                  <Send size={15} /> {isSubmitting ? 'Sending...' : 'Send Word'}
                </button>
              </form>
            )}

            {/* E. Long Answer (Open feedback / Q&A) */}
            {currentQuestion.type === 'long_answer' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitAnswer();
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <textarea
                  rows={4}
                  maxLength={500}
                  disabled={isLocked || isSubmitting}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Type your response or question here..."
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'var(--bg-tertiary)',
                    border: '2px solid var(--border-subtle)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                    resize: 'none',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {textAnswer.length}/500 chars
                  </span>
                  <button
                    type="submit"
                    disabled={isLocked || isSubmitting || !textAnswer.trim()}
                    className="btn-primary"
                    style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                  >
                    <Send size={15} /> {isSubmitting ? 'Submitting...' : 'Submit Response'}
                  </button>
                </div>
              </form>
            )}

            {/* F. Rating Scale */}
            {currentQuestion.type === 'rating_scale' && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '14px',
                  }}
                >
                  {[1, 2, 3, 4, 5].map((num) => {
                    const isSelected = ratingAnswer === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        disabled={isLocked || isSubmitting}
                        onClick={() => {
                          setRatingAnswer(num);
                          handleSubmitAnswer(num.toString());
                        }}
                        style={{
                          flex: 1,
                          aspectRatio: '1',
                          borderRadius: '12px',
                          border: `2px solid ${isSelected ? '#6366f1' : 'var(--border-subtle)'}`,
                          background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          color: isSelected ? '#a5b4fc' : 'inherit',
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 0 16px rgba(99, 102, 241, 0.4)' : 'none',
                        }}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>1 = Lowest</span>
                  <span>5 = Outstanding</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="glass-panel"
            style={{
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            <Sparkles size={40} color="#818cf8" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>
              No Questions Available
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              This presentation does not have any slides configured yet.
            </p>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer style={{ textAlign: 'center', padding: '10px 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        AudienceMeter • Live Real-Time Polling • Independent Navigation Active
      </footer>
    </div>
  );
}

export default function ParticipantJoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading session...</p>
        </div>
      }
    >
      <ParticipantJoinContent params={params} />
    </Suspense>
  );
}
