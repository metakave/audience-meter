'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import {
  fetchPresentation,
  getLocalParticipant,
  saveLocalParticipant,
  registerParticipant,
  submitResponse,
  fetchResponses,
} from '@/lib/storage';
import { Presentation, Participant, ResponseSubmission, Question } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  CheckCircle2,
  Lock,
  ArrowRight,
  User,
  Phone,
  Mail,
  Send,
  Sparkles,
  RefreshCw,
  Edit2,
  Radio,
} from 'lucide-react';

function ParticipantJoinContent({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const [loading, setLoading] = useState(true);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);

  // Registration Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [registering, setRegistering] = useState(false);
  const [formError, setFormError] = useState('');

  // Active voting state
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedMultiple, setSelectedMultiple] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [ratingAnswer, setRatingAnswer] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedForQuestionId, setSubmittedForQuestionId] = useState<string | null>(null);
  const [submittedValue, setSubmittedValue] = useState<string>('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // 1. Initial Load & Restore Participant Profile
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

  // 2. Real-time Subscription to Presentation updates & slide changes
  useEffect(() => {
    if (!presentation) return;

    const supabase = getSupabase();
    let supabaseChannel: any = null;

    if (isSupabaseConfigured && supabase) {
      supabaseChannel = supabase
        .channel(`pres_${code}`)
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
                      showResults: payload.new.show_results,
                      isLive: payload.new.is_live,
                    }
                  : null
              );
            }
          }
        )
        .subscribe();
    }

    // Fallback polling for zero-config mode
    const pollInterval = setInterval(async () => {
      try {
        const pres = await fetchPresentation(code);
        if (pres) {
          setPresentation((prev) => {
            if (
              !prev ||
              prev.currentQuestionIndex !== pres.currentQuestionIndex ||
              prev.isLocked !== pres.isLocked ||
              prev.showResults !== pres.showResults
            ) {
              return pres;
            }
            return prev;
          });
        }
      } catch {}
    }, 1800);

    return () => {
      if (supabaseChannel) supabase?.removeChannel(supabaseChannel);
      clearInterval(pollInterval);
    };
  }, [code, presentation?.id]);

  const currentQuestion: Question | undefined =
    presentation?.questions?.[presentation?.currentQuestionIndex ?? 0];

  // 3. Clear or restore answer when question changes
  useEffect(() => {
    if (!currentQuestion) return;
    // Check if participant already answered this question in previous submissions
    if (participant && presentation) {
      fetchResponses(presentation.id, code).then((resps) => {
        const existing = resps.find(
          (r) => r.participantId === participant.id && r.questionId === currentQuestion.id
        );
        if (existing) {
          setSubmittedForQuestionId(currentQuestion.id);
          setSubmittedValue(existing.value);
          // Restore selections
          if (currentQuestion.type === 'mcq' || currentQuestion.type === 'true_false') {
            setSelectedOption(existing.value);
          } else if (currentQuestion.type === 'multiple_choice') {
            try {
              setSelectedMultiple(JSON.parse(existing.value));
            } catch {
              setSelectedMultiple([existing.value]);
            }
          } else if (currentQuestion.type === 'rating_scale') {
            setRatingAnswer(parseInt(existing.value, 10) || 0);
          } else {
            setTextAnswer(existing.value);
          }
        } else {
          setSubmittedForQuestionId(null);
          setSubmittedValue('');
          setSelectedOption('');
          setSelectedMultiple([]);
          setTextAnswer('');
          setRatingAnswer(0);
        }
      });
    }
  }, [currentQuestion?.id, participant, presentation?.id, code]);

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

    const ok = await submitResponse(submission, code);
    if (ok) {
      setSubmittedForQuestionId(currentQuestion.id);
      setSubmittedValue(valueToSubmit);
    }
    setIsSubmitting(false);
  };

  // Toggle multiple choice options
  const toggleMultiple = (optId: string) => {
    setSelectedMultiple((prev) =>
      prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId]
    );
  };

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
        <div style={{ width: '32px', height: '32px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Joining session {code}...</p>
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div className="glass-panel" style={{ maxWidth: '420px', padding: '36px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Presentation Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            No active session found with code <strong>{code}</strong>. Please verify the room code and try again.
          </p>
          <a href="/join" className="btn-primary" style={{ width: '100%' }}>
            Enter Different Code
          </a>
        </div>
      </div>
    );
  }

  // 1. Participant Registration Screen
  if (!participant || isEditingProfile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
        }}
      >
        <div
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '440px',
            padding: '32px 28px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                color: '#818cf8',
                background: 'rgba(99, 102, 241, 0.1)',
                padding: '4px 12px',
                borderRadius: '9999px',
                marginBottom: '12px',
                fontWeight: 600,
              }}
            >
              <Radio size={14} className="pulse-dot" /> Live Session #{code}
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {presentation.title}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Enter your details once to participate in live polls & Q&A
            </p>
          </div>

          {formError && (
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
              {formError}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                    placeholder="e.g. Sadiq"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Ahmed"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                  }}
                />
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
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: '#ffffff',
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
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: '#ffffff',
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

  // 2. Main Live Participant Voting Interface
  const isAnswered = submittedForQuestionId === currentQuestion?.id;
  const isLocked = presentation.isLocked || currentQuestion?.isLocked;

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
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(18, 22, 31, 0.8)',
          backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            {participant.firstName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {participant.firstName} {participant.lastName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Pin: <span style={{ color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>{code}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsEditingProfile(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '6px 10px',
            borderRadius: '6px',
          }}
        >
          <Edit2 size={12} /> Edit
        </button>
      </header>

      {/* Main Question Card */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: '30px' }}>
        {currentQuestion ? (
          <div
            className="glass-panel"
            style={{
              padding: '28px 22px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Slide Index Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  padding: '3px 10px',
                  borderRadius: '6px',
                }}
              >
                Question {presentation.currentQuestionIndex + 1} of {presentation.questions.length}
              </span>

              {isLocked && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: '#f87171',
                    background: 'rgba(239, 68, 68, 0.15)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  <Lock size={12} /> Voting Locked
                </span>
              )}
            </div>

            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.35,
                marginBottom: currentQuestion.description ? '8px' : '22px',
              }}
            >
              {currentQuestion.title}
            </h2>

            {currentQuestion.description && (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '22px' }}>
                {currentQuestion.description}
              </p>
            )}

            {/* Answered Banner */}
            {isAnswered && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  color: '#34d399',
                  marginBottom: '20px',
                  fontSize: '0.9rem',
                }}
              >
                <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <strong>Response recorded!</strong>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    Waiting for presenter to advance to next question...
                  </div>
                </div>
              </div>
            )}

            {/* A. Single Choice MCQ */}
            {currentQuestion.type === 'mcq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                      {isSelected && <CheckCircle2 size={20} color="#818cf8" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* B. Multiple Choice */}
            {currentQuestion.type === 'multiple_choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  style={{ marginTop: '12px', padding: '14px', fontSize: '1rem' }}
                >
                  {isSubmitting ? 'Submitting...' : `Submit ${selectedMultiple.length} Selected`}
                </button>
              </div>
            )}

            {/* C. True / False */}
            {currentQuestion.type === 'true_false' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
                    padding: '24px 16px',
                    textAlign: 'center',
                    justifyContent: 'center',
                    borderColor: selectedOption === 'true' ? '#10b981' : undefined,
                    background: selectedOption === 'true' ? 'rgba(16, 185, 129, 0.15)' : undefined,
                  }}
                >
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>TRUE</span>
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
                    padding: '24px 16px',
                    textAlign: 'center',
                    justifyContent: 'center',
                    borderColor: selectedOption === 'false' ? '#ef4444' : undefined,
                    background: selectedOption === 'false' ? 'rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                >
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171' }}>FALSE</span>
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
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
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
                    padding: '16px 18px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid var(--border-subtle)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '1.1rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={isLocked || isSubmitting || !textAnswer.trim()}
                  className="btn-primary"
                  style={{ padding: '14px', fontSize: '1rem' }}
                >
                  <Send size={16} /> {isSubmitting ? 'Sending...' : 'Send Word'}
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
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
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
                    padding: '16px 18px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid var(--border-subtle)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    lineHeight: 1.5,
                    resize: 'none',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {textAnswer.length}/500 chars
                  </span>
                  <button
                    type="submit"
                    disabled={isLocked || isSubmitting || !textAnswer.trim()}
                    className="btn-primary"
                    style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                  >
                    <Send size={16} /> {isSubmitting ? 'Submitting...' : 'Submit Response'}
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
                    marginBottom: '16px',
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
                          color: isSelected ? '#a5b4fc' : '#ffffff',
                          fontSize: '1.3rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 0 16px rgba(99, 102, 241, 0.4)' : 'none',
                        }}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
              Waiting for Presenter
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              The presentation has not started or the host is preparing the next question.
            </p>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer style={{ textAlign: 'center', padding: '12px 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        AudienceMeter • Live Real-Time Polling
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
