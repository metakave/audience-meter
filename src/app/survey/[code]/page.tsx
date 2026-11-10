'use client';

import React, { useEffect, useState, use, Suspense, useRef } from 'react';
import Link from 'next/link';
import {
  fetchPresentation,
  getLocalParticipant,
  saveLocalParticipant,
  submitSurvey,
  flushPendingSurveys,
  normalizeBanglaDigits,
} from '@/lib/storage';
import { Presentation, Participant, ResponseSubmission, Question } from '@/types';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  RotateCcw,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Star,
  Check,
  HelpCircle,
  FileText,
  Clock,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { DEFAULT_PRESENTATIONS } from '@/lib/default-data';

function SurveyFormContent({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  // Instant SWR state: check default presentations and localStorage before hitting the network
  const [survey, setSurvey] = useState<Presentation | null>(() => {
    const defaultPres = DEFAULT_PRESENTATIONS.find((p) => p.code === code);
    if (defaultPres) return defaultPres;

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`audiencemeter_survey_${code}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id && Array.isArray(parsed?.questions) && parsed.questions.length > 0) return parsed;
        }
      } catch {}
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    const defaultPres = DEFAULT_PRESENTATIONS.find((p) => p.code === code);
    if (defaultPres) return false;

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`audiencemeter_survey_${code}`);
        if (cached) return false;
      } catch {}
    }
    return true;
  });

  // Respondent info state
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Answers map: questionId -> value (string or JSON string for multiple_choice)
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [otherTextAnswers, setOtherTextAnswers] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Pagination state: up to 20 questions display seamlessly on 1 page; larger assessments paginate by 15
  const totalQuestions = survey?.questions?.length || 0;
  const QUESTIONS_PER_PAGE = totalQuestions <= 20 ? Math.max(1, totalQuestions) : 15;
  const [currentPage, setCurrentPage] = useState(1);

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const totalPages = Math.max(1, Math.ceil(totalQuestions / QUESTIONS_PER_PAGE));
  const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
  const endIndex = Math.min(startIndex + QUESTIONS_PER_PAGE, totalQuestions);
  const currentQuestions = survey?.questions?.slice(startIndex, endIndex) || [];
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;
  const progressPercent = totalPages > 1 ? Math.round((currentPage / totalPages) * 100) : 100;
  const isSurveyBangla = Boolean(
    survey &&
      (/[\u0980-\u09FF]/.test(survey.title || '') ||
        survey.questions?.some((q) => /[\u0980-\u09FF]/.test(q.title || '')))
  );

  // Total answered questions count
  const answeredCount = survey
    ? survey.questions.filter((q) => {
        const val = answers[q.id];
        if (val === undefined || val === null || val === '') return false;
        if (Array.isArray(val) && val.length === 0) return false;
        return true;
      }).length
    : 0;

  // 1. Restore saved respondent info & background revalidate survey
  useEffect(() => {
    let isMounted = true;

    const saved = getLocalParticipant();
    if (saved) {
      const name = `${saved.firstName || ''} ${saved.lastName || ''}`.trim();
      if (name) setFullName(name);
      if (saved.whatsapp) setWhatsapp(saved.whatsapp);
      if (saved.email) setEmail(saved.email);
    }

    // Auto-restore in-progress draft answers if participant reloads or reconnects
    try {
      const draftRaw = localStorage.getItem(`audiencemeter_draft_${code}`);
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        if (draft && typeof draft.answers === 'object' && Object.keys(draft.answers).length > 0) {
          setAnswers(draft.answers);
          if (draft.otherTextAnswers && typeof draft.otherTextAnswers === 'object') {
            setOtherTextAnswers(draft.otherTextAnswers);
          }
          if (draft.fullName) setFullName(draft.fullName);
          if (draft.whatsapp) setWhatsapp(draft.whatsapp);
          if (draft.email) setEmail(draft.email);
          if (typeof draft.isAnonymous === 'boolean') setIsAnonymous(draft.isAnonymous);
          if (draft.currentPage && draft.currentPage > 1) setCurrentPage(draft.currentPage);
          setDraftRestored(true);
          setTimeout(() => setDraftRestored(false), 5000);
        }
      }
    } catch {}

    fetchPresentation(code).then((data) => {
      if (!isMounted) return;
      if (data) {
        setSurvey(data);
        try {
          localStorage.setItem(`audiencemeter_survey_${code}`, JSON.stringify(data));
        } catch {}
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [code]);

  // Background sync: flush any pending surveys whenever device is online
  useEffect(() => {
    const handleOnline = () => {
      flushPendingSurveys();
    };
    window.addEventListener('online', handleOnline);
    flushPendingSurveys();
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Auto-save draft whenever answers, otherTextAnswers, or progress change (protects against browser refresh/crash)
  useEffect(() => {
    if (isSubmitted) return;
    if (Object.keys(answers).length === 0 && !fullName && !whatsapp) return;
    try {
      localStorage.setItem(
        `audiencemeter_draft_${code}`,
        JSON.stringify({
          answers,
          otherTextAnswers,
          fullName,
          whatsapp,
          email,
          isAnonymous,
          currentPage,
          updatedAt: Date.now(),
        })
      );
    } catch {}
  }, [answers, otherTextAnswers, fullName, whatsapp, email, isAnonymous, currentPage, code, isSubmitted]);

  // Handle single choice selection
  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    if (fieldErrors[questionId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  // Handle multiple choice selection
  const handleToggleMultiple = (questionId: string, optionId: string, max?: number) => {
    const current: string[] = answers[questionId] ? (Array.isArray(answers[questionId]) ? answers[questionId] : []) : [];
    let updated: string[];

    if (current.includes(optionId)) {
      updated = current.filter((id) => id !== optionId);
    } else {
      if (max && current.length >= max) {
        // Exceeds max selections, don't add
        return;
      }
      updated = [...current, optionId];
    }

    setAnswers((prev) => ({ ...prev, [questionId]: updated }));
    if (fieldErrors[questionId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  // Handle text input
  const handleTextChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (fieldErrors[questionId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  // Handle rating scale
  const handleRatingSelect = (questionId: string, rating: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: rating.toString() }));
    if (fieldErrors[questionId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  // Handle True / False
  const handleTrueFalseSelect = (questionId: string, value: 'true' | 'false') => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (fieldErrors[questionId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  // Validate fields and questions on a specific page
  const validatePage = (pageNumber: number): boolean => {
    const errors: Record<string, string> = {};
    const settings = survey?.surveySettings;

    // Contact field validations on Page 1 (if not anonymous)
    if (pageNumber === 1 && !isAnonymous) {
      if (settings?.requireName && !fullName.trim()) {
        errors['fullName'] = 'Full Name is required';
      }
      if (settings?.requireWhatsapp && !whatsapp.trim()) {
        errors['whatsapp'] = 'WhatsApp / Mobile Number is required';
      }
      if (settings?.requireEmail) {
        if (!email.trim()) {
          errors['email'] = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          errors['email'] = 'Please enter a valid email address';
        }
      }
    }

    // Question validations for the target page slice
    const pStart = (pageNumber - 1) * QUESTIONS_PER_PAGE;
    const pEnd = Math.min(pStart + QUESTIONS_PER_PAGE, totalQuestions);
    const pageQuestions = survey?.questions?.slice(pStart, pEnd) || [];

    pageQuestions.forEach((q) => {
      if (q.required) {
        const ans = answers[q.id];
        if (ans === undefined || ans === null || ans === '') {
          errors[q.id] = 'This question is required';
        } else if (Array.isArray(ans) && ans.length === 0) {
          errors[q.id] = 'Please select at least one option';
        }
      }
    });

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey === 'fullName' || firstErrorKey === 'whatsapp' || firstErrorKey === 'email') {
        window.scrollTo({ top: 120, behavior: 'smooth' });
      } else {
        const el = questionRefs.current[firstErrorKey];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return false;
    }

    return true;
  };

  const handleNextPage = () => {
    if (!validatePage(currentPage)) return;
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPage = () => {
    setFieldErrors({});
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpToPage = (pageNum: number) => {
    if (pageNum === currentPage) return;
    if (pageNum > currentPage) {
      if (!validatePage(currentPage)) return;
    }
    setFieldErrors({});
    setCurrentPage(pageNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Validate entire form across all pages before final submission
  const validateForm = (): boolean => {
    for (let p = 1; p <= totalPages; p++) {
      if (!validatePage(p)) {
        setCurrentPage(p);
        return false;
      }
    }
    return true;
  };

  // Open confirmation modal after validating all pages
  const handleRequestSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!survey) return;

    if (!validateForm()) return;

    setShowConfirmModal(true);
  };

  // Final confirmed survey execution
  const handleExecuteSubmit = async () => {
    if (!survey || isSubmitting) return;

    setShowConfirmModal(false);
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Build participant profile (extract from fields or custom survey questions)
      let detectedName = fullName.trim();
      let safeWhatsapp = isAnonymous ? '' : normalizeBanglaDigits(whatsapp.trim());
      let safeEmail = isAnonymous ? '' : email.trim().toLowerCase();

      // Smart discovery: check survey questions if top profile fields were left blank
      if (!detectedName) {
        for (const q of survey.questions) {
          const t = q.title.toLowerCase();
          if (t.includes('নাম') || t.includes('name')) {
            const v = answers[q.id];
            if (v && typeof v === 'string' && v.trim()) {
              detectedName = v.trim();
              break;
            }
          }
        }
      }
      if (!safeWhatsapp && !isAnonymous) {
        for (const q of survey.questions) {
          const t = q.title.toLowerCase();
          if (t.includes('ফোন') || t.includes('phone') || t.includes('mobile') || t.includes('whatsapp') || t.includes('নম্বর')) {
            const v = answers[q.id];
            if (v && typeof v === 'string' && v.trim()) {
              safeWhatsapp = normalizeBanglaDigits(v.trim());
              break;
            }
          }
        }
      }

      const nameParts = (isAnonymous ? 'Anonymous Respondent' : (detectedName || 'Anonymous Respondent')).split(' ');
      const firstName = nameParts[0] || 'Anonymous';
      const lastName = nameParts.slice(1).join(' ');

      const participantId = `part_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const participant: Participant = {
        id: participantId,
        presentationId: survey.id,
        roomCode: survey.code,
        firstName,
        lastName,
        whatsapp: safeWhatsapp,
        email: safeEmail,
        joinedAt: new Date().toISOString(),
      };

      // Save to localStorage if not anonymous
      if (!isAnonymous && (fullName.trim() || whatsapp.trim())) {
        saveLocalParticipant({
          firstName,
          lastName,
          whatsapp: safeWhatsapp,
          email: safeEmail,
        });
      }

      // Build submissions array for answered questions
      const submissions: ResponseSubmission[] = [];
      const timestamp = new Date().toISOString();

      survey.questions.forEach((q) => {
        const val = answers[q.id];
        if (val !== undefined && val !== null && val !== '') {
          let stringValue: string;
          if (Array.isArray(val)) {
            const enriched = val.map((id) => {
              const other = otherTextAnswers[`${q.id}_${id}`];
              return other ? `${id}:::${other.trim()}` : id;
            });
            stringValue = JSON.stringify(enriched);
          } else {
            const other = otherTextAnswers[`${q.id}_${val}`];
            stringValue = other ? `${val}:::${other.trim()}` : val.toString();
          }

          submissions.push({
            id: `resp_${participantId}_${q.id}`,
            presentationId: survey.id,
            questionId: q.id,
            participantId,
            participantName: isAnonymous ? 'Anonymous' : (detectedName || 'Anonymous'),
            participantWhatsapp: safeWhatsapp,
            participantEmail: safeEmail,
            value: stringValue,
            createdAt: timestamp,
          });
        }
      });

      // Submit all responses at once (passing survey presentation to ensure DB foreign-key consistency)
      const success = await submitSurvey(participant, submissions, survey.code, survey);

      if (success) {
        setIsSubmitted(true);
        // Clear saved in-progress draft from localStorage on successful completion
        try {
          localStorage.removeItem(`audiencemeter_draft_${code}`);
        } catch {}

        // Confetti celebration
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {}
      } else {
        setSubmitError(
          isSurveyBangla
            ? 'সার্ভে জমা দিতে সমস্যা হয়েছে। আপনার উত্তরগুলো নিরাপদে রাখা আছে, অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
            : 'Connection was interrupted. Your answers are safely preserved. Please tap Retry to submit.'
        );
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(err?.message || 'An unexpected error occurred while submitting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnotherResponse = () => {
    try {
      localStorage.removeItem(`audiencemeter_draft_${code}`);
    } catch {}
    setAnswers({});
    setFieldErrors({});
    setCurrentPage(1);
    setIsSubmitted(false);
    setSubmitError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading Skeleton Screen (Instant perception of structure)
  if (loading && !survey) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 32px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ width: '140px', height: '20px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <ThemeToggle />
        </header>

        <main style={{ maxWidth: '780px', width: '100%', margin: '0 auto', padding: '32px 16px 60px' }}>
          {/* Header Card Skeleton */}
          <div className="glass-panel" style={{ borderRadius: '16px', padding: '32px', marginBottom: '20px' }}>
            <div style={{ height: '32px', width: '70%', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', marginBottom: '16px' }} />
            <div style={{ height: '16px', width: '90%', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', marginBottom: '8px' }} />
            <div style={{ height: '16px', width: '50%', borderRadius: '4px', background: 'rgba(255,255,255,0.04)' }} />
          </div>

          {/* Question Skeleton Cards */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel" style={{ borderRadius: '16px', padding: '24px 28px', marginBottom: '20px' }}>
              <div style={{ height: '20px', width: '55%', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', marginBottom: '16px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }} />
                <div style={{ height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }} />
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  // Not Found Screen
  if (!survey) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '40px 32px', textAlign: 'center' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Survey Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
            We could not find an active survey for PIN or share code <strong>{code}</strong>. Please check the link or ask the organizer.
          </p>
          <Link href="/" className="btn-primary" style={{ display: 'inline-flex', padding: '10px 20px' }}>
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Closed Survey Screen
  if (survey.isLive === false) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📋</span>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>AudienceMeter Forms</span>
          </div>
          <ThemeToggle />
        </header>

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '40px 32px', textAlign: 'center' }}>
            <Clock size={48} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px' }}>
              {survey.title}
            </h2>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                marginBottom: '20px',
              }}
            >
              Survey Session Closed
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '28px' }}>
              This survey form is no longer accepting new responses. Thank you for your interest and participation!
            </p>
            <Link href="/" className="btn-secondary" style={{ display: 'inline-flex', padding: '10px 20px' }}>
              Return to Homepage
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Thank You / Submission Confirmation Screen
  if (isSubmitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📋</span>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>AudienceMeter Forms</span>
          </div>
          <ThemeToggle />
        </header>

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '44px 32px',
              textAlign: 'center',
              borderRadius: '20px',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <CheckCircle2 size={36} color="#10b981" />
            </div>

            {(() => {
              const isSurveyBangla = /[\u0980-\u09FF]/.test(survey.title || '') || /[\u0980-\u09FF]/.test(survey.description || '');
              return (
                <>
                  <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px' }}>
                    {isSurveyBangla ? 'উত্তর সফলভাবে সংরক্ষিত হয়েছে! 🎉' : 'Response Recorded! 🎉'}
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '20px' }}>
                    {survey.title}
                  </p>

                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '28px',
                      textAlign: 'left',
                      fontSize: '0.92rem',
                      lineHeight: 1.6,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {survey.surveySettings?.thankYouMessage ||
                      (isSurveyBangla
                        ? 'আপনার উত্তর সফলভাবে সংরক্ষিত হয়েছে। অংশগ্রহণের জন্য ধন্যবাদ!'
                        : 'Thank you for submitting your feedback! Your answers have been successfully stored in the database.')}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {survey.surveySettings?.allowMultipleSubmissions !== false && (
                      <button
                        type="button"
                        onClick={handleResetForAnotherResponse}
                        className="btn-primary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '12px',
                          fontSize: '0.95rem',
                        }}
                      >
                        <RotateCcw size={16} /> {isSurveyBangla ? 'আরেকটি উত্তর জমা দিন' : 'Submit Another Response'}
                      </button>
                    )}

                    <Link
                      href="/"
                      className="btn-secondary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        fontSize: '0.95rem',
                      }}
                    >
                      {isSurveyBangla ? 'মূল পাতায় ফিরে যান' : 'Back to Homepage'}
                    </Link>
                  </div>
                </>
              );
            })()}
          </div>
        </main>
      </div>
    );
  }

  // Main Google Forms-Style Survey View
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Confirmation Modal Popup */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirmModal(false);
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '520px',
              width: '100%',
              borderRadius: '24px',
              padding: '32px 28px',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(99, 102, 241, 0.25)',
              background: 'var(--bg-card, #131722)',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                  flexShrink: 0,
                }}
              >
                <HelpCircle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                  Ready to Submit?
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
                  Please confirm your feedback submission
                </p>
              </div>
            </div>

            {/* Survey Title */}
            <div
              style={{
                fontSize: '0.94rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              📄 {survey.title}
            </div>

            {/* Summary Information Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {/* Question Count & Completion */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Questions Answered
                </span>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: answeredCount === totalQuestions ? '#10b981' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {answeredCount} of {totalQuestions}
                  <span
                    style={{
                      fontSize: '0.78rem',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: answeredCount === totalQuestions ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: answeredCount === totalQuestions ? '#10b981' : '#818cf8',
                    }}
                  >
                    {Math.round((answeredCount / (totalQuestions || 1)) * 100)}%
                  </span>
                </span>
              </div>

              {/* Respondent Identity */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.8rem' }}>
                  Submitting As
                </div>
                {isAnonymous ? (
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} color="#10b981" /> Anonymous Respondent (identity hidden)
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {fullName.trim() || 'Anonymous Participant'}
                    </div>
                    {(whatsapp.trim() || email.trim()) && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {[whatsapp.trim(), email.trim()].filter(Boolean).join(' • ')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Optional unanswered reminder */}
              {answeredCount < totalQuestions && (
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed var(--border-subtle)',
                  }}
                >
                  ℹ️ You have {totalQuestions - answeredCount} optional question(s) left blank. You can still submit now or review them.
                </div>
              )}
            </div>

            {/* Advisory Warning */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                marginBottom: '24px',
                fontSize: '0.82rem',
                color: '#fbbf24',
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Important:</strong> Answers cannot be edited after submission. Please ensure all your answers are final before proceeding.
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary"
                style={{
                  padding: '11px 20px',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Review Answers
              </button>
              <button
                type="button"
                onClick={handleExecuteSubmit}
                disabled={isSubmitting}
                className="btn-primary"
                style={{
                  padding: '11px 24px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: '0 4px 16px var(--accent-glow)',
                }}
              >
                <Send size={16} />
                <span>{isSubmitting ? 'Submitting...' : 'Confirm & Submit'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Full-Screen Blurred Submission In-Progress Overlay */}
      {isSubmitting && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'rgba(8, 12, 24, 0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '44px 32px 36px',
              textAlign: 'center',
              borderRadius: '24px',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.7), 0 0 45px rgba(99, 102, 241, 0.25)',
              background: 'var(--bg-card, #131722)',
            }}
          >
            {/* Glowing animated spinner */}
            <div style={{ position: 'relative', width: '76px', height: '76px', margin: '0 auto 24px' }}>
              {/* Outer pulsing glow */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, rgba(168, 85, 247, 0) 70%)',
                  animation: 'pulseGlow 1.8s ease-in-out infinite',
                }}
              />
              {/* Rotating spinner ring */}
              <div
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  border: '4px solid rgba(99, 102, 241, 0.18)',
                  borderTopColor: '#6366f1',
                  borderRightColor: '#a855f7',
                  animation: 'spin 0.9s cubic-bezier(0.5, 0.1, 0.2, 1) infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                }}
              >
                <Send size={24} style={{ opacity: 0.9 }} />
              </div>
            </div>

            <h3
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '8px',
                letterSpacing: '-0.3px',
              }}
            >
              Submitting Feedback...
            </h3>

            {/* Pill badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.14)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#a5b4fc',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              <Clock size={14} />
              <span>Please Wait a Few Seconds</span>
            </div>

            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                marginBottom: '22px',
                maxWidth: '380px',
                margin: '0 auto 22px',
              }}
            >
              Your feedback is being securely saved to the database. We will confirm as soon as it is recorded.
            </p>

            {/* Shimmering animated progress bar */}
            <div
              style={{
                width: '100%',
                height: '5px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                position: 'relative',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: '45%',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                  animation: 'shimmerSlide 1.5s ease-in-out infinite alternate',
                }}
              />
            </div>

            {/* Warning advisory */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                color: '#facc15',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              <AlertCircle size={14} />
              <span>Please do not close or reload this page</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 32px',
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
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1rem',
            }}
          >
            📋
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
              AudienceMeter Forms
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '4px 10px',
              borderRadius: '9999px',
            }}
          >
            ● Accepting Responses
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '36px 16px 64px', maxWidth: '760px', margin: '0 auto', width: '100%' }}>
        {draftRestored && (
          <div
            style={{
              marginBottom: '16px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
            }}
          >
            <span>✨</span>
            <span>Your previous in-progress answers were automatically restored.</span>
          </div>
        )}
        <form onSubmit={handleRequestSubmit} noValidate>
          {/* Survey Header Card (Google Forms Banner Card) */}
          <div
            className="glass-panel"
            style={{
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '20px',
              position: 'relative',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            }}
          >
            {/* Top Colored Accent Stripe */}
            <div
              style={{
                height: '10px',
                background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
                width: '100%',
              }}
            />

            <div style={{ padding: '32px 28px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.5px' }}>
                  {survey.title}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: '#10b981',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      fontWeight: 600,
                    }}
                    title="All progress and draft answers are continuously saved locally"
                  >
                    <Check size={12} strokeWidth={3} /> {isSurveyBangla ? 'অটো-সেভ সক্রিয়' : 'Auto-saved'}
                  </span>
                  <span className="code-pill" title="Survey Share Code">
                    Code: {survey.code}
                  </span>
                </div>
              </div>

              {survey.description && (
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.98rem',
                    lineHeight: 1.6,
                    marginTop: '12px',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {survey.description}
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>{survey.questions.length} questions</span>
                <span>•</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>* Indicates required question</span>
              </div>
            </div>
          </div>

          {/* Pagination & Progress Indicator (if totalPages > 1) */}
          {totalPages > 1 && (
            <div
              className="glass-panel"
              style={{
                borderRadius: '16px',
                padding: '16px 24px',
                marginBottom: '20px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      background: 'var(--accent-primary)',
                      color: '#ffffff',
                    }}
                  >
                    Page {currentPage} of {totalPages}
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Questions {startIndex + 1}–{endIndex} of {totalQuestions}
                  </span>
                </div>

                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {progressPercent}% Complete
                </span>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '7px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    borderRadius: '9999px',
                    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Quick Jump Part Tabs */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  const pStart = i * QUESTIONS_PER_PAGE + 1;
                  const pEnd = Math.min((i + 1) * QUESTIONS_PER_PAGE, totalQuestions);
                  const isActive = pageNum === currentPage;
                  const isCompleted = pageNum < currentPage;

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handleJumpToPage(pageNum)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isActive
                          ? '1.5px solid var(--accent-primary)'
                          : '1px solid var(--border-subtle)',
                        background: isActive
                          ? 'rgba(99, 102, 241, 0.2)'
                          : isCompleted
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(255, 255, 255, 0.03)',
                        color: isActive
                          ? '#ffffff'
                          : isCompleted
                          ? '#10b981'
                          : 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isCompleted && '✓ '}Part {pageNum} ({pStart}–{pEnd})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Respondent Contact Info Card (shown on Page 1) */}
          {isFirstPage && survey.surveySettings?.collectParticipantInfo !== false && (
            <div
              className="glass-panel"
              style={{
                borderRadius: '16px',
                padding: '24px 28px',
                marginBottom: '20px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Respondent Details</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {survey.surveySettings?.isAnonymous
                      ? 'You can provide your details or choose to submit anonymously.'
                      : 'Please provide your details below.'}
                  </p>
                </div>

                {survey.surveySettings?.isAnonymous && (
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: isAnonymous ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isAnonymous ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      color: isAnonymous ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Submit Anonymously</span>
                  </label>
                )}
              </div>

              {!isAnonymous && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  {/* Full Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Full Name {survey.surveySettings?.requireName && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (fieldErrors['fullName']) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next['fullName'];
                              return next;
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault();
                        }}
                        placeholder="John Doe"
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 36px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${fieldErrors['fullName'] ? '#ef4444' : 'var(--border-subtle)'}`,
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          color: 'inherit',
                        }}
                      />
                    </div>
                    {fieldErrors['fullName'] && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                        {fieldErrors['fullName']}
                      </span>
                    )}
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      WhatsApp / Mobile {survey.surveySettings?.requireWhatsapp && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                      <input
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => {
                          const norm = normalizeBanglaDigits(e.target.value);
                          setWhatsapp(norm);
                          if (fieldErrors['whatsapp']) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next['whatsapp'];
                              return next;
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault();
                        }}
                        placeholder="+1 234 567 8900"
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 36px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${fieldErrors['whatsapp'] ? '#ef4444' : 'var(--border-subtle)'}`,
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          color: 'inherit',
                        }}
                      />
                    </div>
                    {fieldErrors['whatsapp'] && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                        {fieldErrors['whatsapp']}
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Email Address {survey.surveySettings?.requireEmail && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (fieldErrors['email']) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next['email'];
                              return next;
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault();
                        }}
                        placeholder="john@example.com"
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 36px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${fieldErrors['email'] ? '#ef4444' : 'var(--border-subtle)'}`,
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          color: 'inherit',
                        }}
                      />
                    </div>
                    {fieldErrors['email'] && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                        {fieldErrors['email']}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Questions List (Paginated: 15 questions per page) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {currentQuestions.map((q, idx) => {
              const absoluteIndex = startIndex + idx + 1;
              const hasError = Boolean(fieldErrors[q.id]);
              const currentAnswer = answers[q.id];
              const isBanglaQuestion = /[\u0980-\u09FF]/.test(q.title || '');

              return (
                <div
                  key={q.id}
                  ref={(el) => {
                    questionRefs.current[q.id] = el;
                  }}
                  className="glass-panel"
                  style={{
                    borderRadius: '16px',
                    padding: '24px 28px',
                    border: hasError
                      ? '1px solid #ef4444'
                      : '1px solid var(--border-subtle)',
                    boxShadow: hasError ? '0 0 16px rgba(239, 68, 68, 0.2)' : 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  {/* Question Header */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        {isBanglaQuestion ? `প্রশ্ন ${absoluteIndex}` : `Question ${absoluteIndex}`}
                      </span>
                      {q.required && (
                        <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.9rem' }} title="Required">
                          *
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.4 }}>
                      {q.title}
                    </h3>

                    {q.description && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                        {q.description}
                      </p>
                    )}
                  </div>

                  {/* Question Inputs */}

                  {/* 1. Single Choice (MCQ) */}
                  {q.type === 'mcq' && q.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {q.options.map((opt) => {
                        const isSelected = currentAnswer === opt.id;
                        const hasOtherInput = opt.text.includes('অন্যান্য') || opt.text.toLowerCase().includes('other');
                        return (
                          <div key={opt.id}>
                            <div
                              onClick={() => handleSelectOption(q.id, opt.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--text-muted)'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {isSelected && (
                                  <div
                                    style={{
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '50%',
                                      background: 'var(--accent-primary)',
                                    }}
                                  />
                                )}
                              </div>
                              <span style={{ fontSize: '0.92rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                {opt.text}
                              </span>
                            </div>
                            {isSelected && hasOtherInput && (
                              <div style={{ marginTop: '8px', paddingLeft: '30px' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={otherTextAnswers[`${q.id}_${opt.id}`] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setOtherTextAnswers((prev) => ({ ...prev, [`${q.id}_${opt.id}`]: val }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.preventDefault();
                                  }}
                                  placeholder={isBanglaQuestion ? 'অন্যান্য বিবরণ বা পণ্যের নাম লিখুন...' : 'Please specify...'}
                                  style={{
                                    width: '100%',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: '1.5px solid var(--accent-primary)',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    fontSize: '0.88rem',
                                    color: 'inherit',
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Multiple Choice (Checkboxes) */}
                  {q.type === 'multiple_choice' && q.options && (
                    <div>
                      {q.maxSelections && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                          {isBanglaQuestion
                            ? `সর্বোচ্চ ${q.maxSelections}টি অপশন নির্বাচন করুন`
                            : `Select up to ${q.maxSelections} ${q.maxSelections === 1 ? 'option' : 'options'}`}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {q.options.map((opt) => {
                          const selectedList: string[] = Array.isArray(currentAnswer) ? currentAnswer : [];
                          const isSelected = selectedList.includes(opt.id);
                          const hasOtherInput = opt.text.includes('অন্যান্য') || opt.text.toLowerCase().includes('other');
                          return (
                            <div key={opt.id}>
                              <div
                                onClick={() => handleToggleMultiple(q.id, opt.id, q.maxSelections)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '12px 16px',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                  border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '4px',
                                    border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--text-muted)'}`,
                                    background: isSelected ? 'var(--accent-primary)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                                </div>
                                <span style={{ fontSize: '0.92rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                  {opt.text}
                                </span>
                              </div>
                              {isSelected && hasOtherInput && (
                                <div style={{ marginTop: '8px', paddingLeft: '30px' }} onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={otherTextAnswers[`${q.id}_${opt.id}`] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setOtherTextAnswers((prev) => ({ ...prev, [`${q.id}_${opt.id}`]: val }));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') e.preventDefault();
                                    }}
                                    placeholder={isBanglaQuestion ? 'অন্যান্য বিবরণ বা পণ্যের নাম লিখুন...' : 'Please specify...'}
                                    style={{
                                      width: '100%',
                                      padding: '8px 14px',
                                      borderRadius: '8px',
                                      border: '1.5px solid var(--accent-primary)',
                                      background: 'rgba(255, 255, 255, 0.06)',
                                      fontSize: '0.88rem',
                                      color: 'inherit',
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Short Answer */}
                  {q.type === 'short_answer' && (
                    <input
                      type="text"
                      value={currentAnswer || ''}
                      onChange={(e) => {
                        const val = q.title.includes('ফোন') || q.title.includes('phone') || q.title.includes('mobile') || q.title.includes('নম্বর')
                          ? normalizeBanglaDigits(e.target.value)
                          : e.target.value;
                        handleTextChange(q.id, val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      placeholder={isBanglaQuestion ? 'এখানে আপনার উত্তর লিখুন...' : 'Your answer...'}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: 'inherit',
                      }}
                    />
                  )}

                  {/* 4. Long Answer */}
                  {q.type === 'long_answer' && (
                    <textarea
                      rows={4}
                      value={currentAnswer || ''}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      placeholder="Type your feedback, comments, or detailed response here..."
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: 'inherit',
                        lineHeight: 1.5,
                        resize: 'vertical',
                      }}
                    />
                  )}

                  {/* 5. Rating Scale (1 to 5) */}
                  {q.type === 'rating_scale' && (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginBottom: '8px',
                        }}
                      >
                        {Array.from(
                          { length: (q.maxRating || 5) - (q.minRating || 1) + 1 },
                          (_, i) => (q.minRating || 1) + i
                        ).map((num) => {
                          const isSelected = currentAnswer === num.toString();
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleRatingSelect(q.id, num)}
                              style={{
                                flex: 1,
                                minWidth: '46px',
                                height: '50px',
                                borderRadius: '10px',
                                border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                                background: isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.04)',
                                color: isSelected ? '#ffffff' : 'inherit',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0 4px' }}>
                        <span>Poor (1)</span>
                        <span>Outstanding ({q.maxRating || 5})</span>
                      </div>
                    </div>
                  )}

                  {/* 6. True / False */}
                  {q.type === 'true_false' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => handleTrueFalseSelect(q.id, 'true')}
                        style={{
                          padding: '14px',
                          borderRadius: '10px',
                          border: `1.5px solid ${currentAnswer === 'true' ? '#10b981' : 'var(--border-subtle)'}`,
                          background: currentAnswer === 'true' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          color: currentAnswer === 'true' ? '#10b981' : 'inherit',
                          fontSize: '1rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        {isBanglaQuestion ? '👍 সত্য' : '👍 True'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTrueFalseSelect(q.id, 'false')}
                        style={{
                          padding: '14px',
                          borderRadius: '10px',
                          border: `1.5px solid ${currentAnswer === 'false' ? '#ef4444' : 'var(--border-subtle)'}`,
                          background: currentAnswer === 'false' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          color: currentAnswer === 'false' ? '#ef4444' : 'inherit',
                          fontSize: '1rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        {isBanglaQuestion ? '👎 মিথ্যা' : '👎 False'}
                      </button>
                    </div>
                  )}

                  {/* Inline Error Message */}
                  {hasError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.8rem', marginTop: '10px' }}>
                      <AlertCircle size={14} />
                      <span>{fieldErrors[q.id]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Form Navigation & Submit Footer */}
          <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {submitError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#ef4444',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{submitError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleExecuteSubmit}
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RotateCcw size={14} /> {isSurveyBangla ? 'পুনরায় চেষ্টা করুন' : 'Retry Submission'}
                </button>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              {!isFirstPage ? (
                <button
                  type="button"
                  onClick={handlePrevPage}
                  className="btn-secondary"
                  style={{
                    padding: '12px 22px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={16} /> Previous 15 Questions
                </button>
              ) : (
                <div />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {!isLastPage ? (
                  <button
                    type="button"
                    onClick={handleNextPage}
                    className="btn-primary"
                    style={{
                      padding: '13px 26px',
                      fontSize: '0.98rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px var(--accent-glow)',
                    }}
                  >
                    <span>Next 15 Questions ({endIndex + 1}–{Math.min(endIndex + QUESTIONS_PER_PAGE, totalQuestions)})</span>
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{
                      padding: '14px 32px',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.7 : 1,
                      boxShadow: '0 4px 20px var(--accent-glow)',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid #ffffff',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        />
                        <span>Submitting Feedback...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>{survey.surveySettings?.submitButtonText || 'Submit Survey Feedback'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {totalPages > 1
                  ? `Showing questions ${startIndex + 1}–${endIndex} of ${totalQuestions} (Page ${currentPage} of ${totalPages})`
                  : 'Never submit passwords or sensitive financial credentials through this form.'}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Powered by AudienceMeter Forms
              </span>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function SurveyPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading Survey...</p>
        </div>
      }
    >
      <SurveyFormContent params={params} />
    </Suspense>
  );
}
