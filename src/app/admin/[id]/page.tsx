'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Presentation, Question, QuestionType, QuestionOption } from '@/types';
import { fetchPresentation, savePresentation } from '@/lib/storage';
import { DEFAULT_PRESENTATIONS } from '@/lib/default-data';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Play,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Layers,
  Settings,
  GripVertical,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const QUESTION_TYPES: { type: QuestionType; label: string; desc: string }[] = [
  { type: 'mcq', label: 'Single Choice (MCQ)', desc: 'Audience picks 1 option with live animated bar chart' },
  { type: 'multiple_choice', label: 'Multiple Choice', desc: 'Audience selects one or more options' },
  { type: 'short_answer', label: 'Short Answer (Word Cloud)', desc: 'Generates a dynamic interactive word cloud' },
  { type: 'long_answer', label: 'Long Answer / Q&A', desc: 'Open-ended feedback, suggestions or questions' },
  { type: 'true_false', label: 'True / False', desc: 'Instant high-contrast pulse check' },
  { type: 'rating_scale', label: 'Rating Scale (1-5)', desc: 'Numeric or star ratings with live average calculation' },
];

function EditorContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomCodeParam = searchParams.get('code') || '824915';

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const pres = await fetchPresentation(roomCodeParam);
      if (pres) {
        setPresentation(pres);
      } else {
        const foundDefault = DEFAULT_PRESENTATIONS.find((p) => p.id === id || p.code === roomCodeParam);
        setPresentation(foundDefault || DEFAULT_PRESENTATIONS[0]);
      }
      setLoading(false);
    }
    load();
  }, [id, roomCodeParam]);

  const activeQuestion = presentation?.questions[selectedQuestionIdx];

  const handleUpdateTitle = (title: string) => {
    if (!presentation) return;
    setPresentation({ ...presentation, title });
  };

  const handleAddQuestion = (type: QuestionType) => {
    if (!presentation) return;

    const newQ: Question = {
      id: `q_${Date.now()}`,
      type,
      title: type === 'true_false' ? 'Statement to verify' : 'New Question Title',
      description: '',
      showResultsToAudience: true,
      isLocked: false,
      options:
        type === 'mcq' || type === 'multiple_choice'
          ? [
              { id: `opt_${Date.now()}_1`, text: 'Option 1' },
              { id: `opt_${Date.now()}_2`, text: 'Option 2' },
              { id: `opt_${Date.now()}_3`, text: 'Option 3' },
            ]
          : undefined,
      minRating: type === 'rating_scale' ? 1 : undefined,
      maxRating: type === 'rating_scale' ? 5 : undefined,
    };

    const updated = {
      ...presentation,
      questions: [...presentation.questions, newQ],
    };
    setPresentation(updated);
    setSelectedQuestionIdx(updated.questions.length - 1);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (!presentation || presentation.questions.length <= 1) {
      alert('Presentation must have at least one slide.');
      return;
    }
    const filtered = presentation.questions.filter((_, i) => i !== idx);
    setPresentation({ ...presentation, questions: filtered });
    setSelectedQuestionIdx(Math.max(0, idx - 1));
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    if (!presentation) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= presentation.questions.length) return;

    const list = [...presentation.questions];
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    setPresentation({ ...presentation, questions: list });
    setSelectedQuestionIdx(targetIdx);
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx.toString());
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx || !presentation) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const list = [...presentation.questions];
    const [moved] = list.splice(draggedIdx, 1);
    list.splice(targetIdx, 0, moved);

    setPresentation({ ...presentation, questions: list });
    setSelectedQuestionIdx(targetIdx);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleUpdateActiveQuestion = (field: keyof Question, value: any) => {
    if (!presentation || !activeQuestion) return;
    const list = [...presentation.questions];
    list[selectedQuestionIdx] = { ...activeQuestion, [field]: value };
    setPresentation({ ...presentation, questions: list });
  };

  // Option management for MCQ & Multiple Choice
  const handleAddOption = () => {
    if (!presentation || !activeQuestion) return;
    const currentOptions = activeQuestion.options || [];
    const newOpt: QuestionOption = {
      id: `opt_${Date.now()}_${currentOptions.length + 1}`,
      text: `Option ${currentOptions.length + 1}`,
    };
    handleUpdateActiveQuestion('options', [...currentOptions, newOpt]);
  };

  const handleUpdateOption = (optId: string, text: string) => {
    if (!presentation || !activeQuestion || !activeQuestion.options) return;
    const updated = activeQuestion.options.map((opt) =>
      opt.id === optId ? { ...opt, text } : opt
    );
    handleUpdateActiveQuestion('options', updated);
  };

  const handleDeleteOption = (optId: string) => {
    if (!presentation || !activeQuestion || !activeQuestion.options) return;
    if (activeQuestion.options.length <= 2) {
      alert('Multiple choice questions require at least 2 options.');
      return;
    }
    const updated = activeQuestion.options.filter((opt) => opt.id !== optId);
    handleUpdateActiveQuestion('options', updated);
  };

  const handleSave = async () => {
    if (!presentation) return;
    setSaving(true);
    await savePresentation(presentation);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  if (loading || !presentation) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading presentation editor...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Editor Top Navigation */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => router.push('/admin')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <input
            type="text"
            value={presentation.title}
            onChange={(e) => handleUpdateTitle(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              minWidth: '320px',
            }}
          />

          <span className="code-pill">PIN: {presentation.code}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeToggle />
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-secondary"
            style={{ fontSize: '0.9rem' }}
          >
            {saveSuccess ? (
              <>
                <CheckCircle size={16} color="#10b981" /> Saved!
              </>
            ) : (
              <>
                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
              </>
            )}
          </button>

          <a
            href={`/present/${presentation.code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ fontSize: '0.9rem' }}
          >
            <Play size={16} fill="#ffffff" /> Launch Presenter View
          </a>
        </div>
      </header>

      {/* Main Split Editor View */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Column: Slide List & Reordering */}
        <aside
          style={{
            width: '320px',
            borderRight: '1px solid var(--border-subtle)',
            background: 'rgba(18, 22, 31, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: 'calc(100vh - 65px)',
          }}
        >
          {/* Slides List */}
          <div style={{ overflowY: 'auto', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Slides ({presentation.questions.length})
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Drag to reorder
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {presentation.questions.map((q, idx) => {
                const isSelected = selectedQuestionIdx === idx;
                const isDragging = draggedIdx === idx;
                const isDragOver = dragOverIdx === idx;

                return (
                  <div
                    key={q.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedQuestionIdx(idx)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: isDragOver
                        ? 'rgba(99, 102, 241, 0.25)'
                        : isSelected
                        ? 'rgba(99, 102, 241, 0.15)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isDragOver
                        ? '2px dashed var(--accent-primary)'
                        : `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      cursor: 'grab',
                      opacity: isDragging ? 0.4 : 1,
                      transform: isDragOver ? 'scale(1.02)' : 'none',
                      transition: 'all 0.18s ease',
                      boxShadow: isDragOver ? '0 4px 16px rgba(99, 102, 241, 0.3)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          title="Drag to reorder"
                          style={{
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'grab',
                          }}
                        >
                          <GripVertical size={15} />
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? '#a5b4fc' : 'var(--text-muted)' }}>
                          {idx + 1}. {q.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveQuestion(idx, 'up');
                          }}
                          disabled={idx === 0}
                          title="Move up"
                          style={{ padding: '2px', color: idx === 0 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)' }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveQuestion(idx, 'down');
                          }}
                          disabled={idx === presentation.questions.length - 1}
                          title="Move down"
                          style={{ padding: '2px', color: idx === presentation.questions.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)' }}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQuestion(idx);
                          }}
                          title="Delete slide"
                          style={{ padding: '2px', color: '#f87171', marginLeft: '4px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: '21px' }}>
                      {q.title || 'Untitled Question'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Slide Dropdown / Quick Buttons */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Add Question Type:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {QUESTION_TYPES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => handleAddQuestion(t.type)}
                  className="btn-secondary"
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                    justifyContent: 'flex-start',
                    borderRadius: '8px',
                  }}
                  title={t.desc}
                >
                  <Plus size={12} /> {t.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Column: Slide Editor Form */}
        <main style={{ flex: 1, padding: '36px 48px', overflowY: 'auto' }}>
          {activeQuestion ? (
            <div style={{ maxWidth: '720px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#818cf8' }}>
                  Editing Slide {selectedQuestionIdx + 1}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {QUESTION_TYPES.find((t) => t.type === activeQuestion.type)?.label}
                </span>
              </div>

              {/* Question Title */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Question Title / Statement *
                </label>
                <input
                  type="text"
                  value={activeQuestion.title}
                  onChange={(e) => handleUpdateActiveQuestion('title', e.target.value)}
                  placeholder="Enter your question here..."
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    color: '#ffffff',
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Subtitle / Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={activeQuestion.description || ''}
                  onChange={(e) => handleUpdateActiveQuestion('description', e.target.value)}
                  placeholder="e.g. Choose one option or type in your response"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.95rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Type-Specific Options (for MCQ and Multiple Choice) */}
              {(activeQuestion.type === 'mcq' || activeQuestion.type === 'multiple_choice') && (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Response Options
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      <Plus size={14} /> Add Option
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeQuestion.options?.map((opt, idx) => (
                      <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            flexShrink: 0,
                          }}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>

                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleUpdateOption(opt.id, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            fontSize: '1rem',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '10px',
                            color: '#ffffff',
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => handleDeleteOption(opt.id)}
                          style={{ padding: '8px', color: '#f87171' }}
                          title="Remove option"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* True/False Info Notice */}
              {activeQuestion.type === 'true_false' && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    marginBottom: '28px',
                  }}
                >
                  Participants will be presented with high-contrast <strong>TRUE</strong> and <strong>FALSE</strong> buttons. Perfect for quick comprehension checks or audience consensus.
                </div>
              )}

              {/* Short Answer Info Notice */}
              {activeQuestion.type === 'short_answer' && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    marginBottom: '28px',
                  }}
                >
                  Audience members will submit single words or short phrases. These automatically assemble into a live dynamic <strong>Word Cloud</strong> on the presentation screen!
                </div>
              )}

              {/* Rating Scale Info */}
              {activeQuestion.type === 'rating_scale' && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    marginBottom: '28px',
                  }}
                >
                  Participants rate from <strong>1 (Lowest)</strong> to <strong>5 (Highest)</strong>. The public screen calculates and animates the live weighted average.
                </div>
              )}

              {/* Slide Settings */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Slide Settings
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={activeQuestion.showResultsToAudience ?? true}
                    onChange={(e) => handleUpdateActiveQuestion('showResultsToAudience', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>Show live results on presentation screen</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={activeQuestion.isLocked ?? false}
                    onChange={(e) => handleUpdateActiveQuestion('isLocked', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#ef4444' }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>Freeze / Lock voting for this question</span>
                </label>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Select or add a question from the left sidebar to start editing.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function PresentationEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading editor...</p>
        </div>
      }
    >
      <EditorContent params={params} />
    </Suspense>
  );
}
