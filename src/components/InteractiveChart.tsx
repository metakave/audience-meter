'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, AlignLeft, Check } from 'lucide-react';

export interface ChartOptionItem {
  id: string;
  label: string;
  text: string;
  count: number;
  isCorrect?: boolean;
}

interface InteractiveChartProps {
  options: ChartOptionItem[];
  totalVotes: number;
}

const BAR_GRADIENTS_VERTICAL = [
  'linear-gradient(180deg, #818cf8 0%, #4f46e5 100%)',
  'linear-gradient(180deg, #22d3ee 0%, #0891b2 100%)',
  'linear-gradient(180deg, #34d399 0%, #059669 100%)',
  'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
  'linear-gradient(180deg, #f472b6 0%, #db2777 100%)',
  'linear-gradient(180deg, #a78bfa 0%, #7c3aed 100%)',
];

const BAR_GRADIENTS_HORIZONTAL = [
  'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)',
  'linear-gradient(90deg, #06b6d4 0%, #22d3ee 100%)',
  'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
  'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
  'linear-gradient(90deg, #ec4899 0%, #f472b6 100%)',
  'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
];

export default function InteractiveChart({ options, totalVotes }: InteractiveChartProps) {
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
  const [pulsingOptionId, setPulsingOptionId] = useState<string | null>(null);
  const prevCountsRef = useRef<Record<string, number>>({});

  // Detect vote increment to trigger pulse animation
  useEffect(() => {
    options.forEach((opt) => {
      const prev = prevCountsRef.current[opt.id] ?? 0;
      if (opt.count > prev) {
        setPulsingOptionId(opt.id);
        setTimeout(() => setPulsingOptionId(null), 1200);
      }
      prevCountsRef.current[opt.id] = opt.count;
    });
  }, [options]);

  const maxCount = Math.max(...options.map((o) => o.count), 1);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '32px',
        borderRadius: 'var(--radius-lg)',
        position: 'relative',
      }}
    >
      {/* Top Layout Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Display Mode:
          </span>
          <div
            style={{
              display: 'inline-flex',
              padding: '2px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setLayout('vertical')}
              title="Mentimeter Vertical Columns"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: layout === 'vertical' ? 'var(--accent-primary)' : 'transparent',
                color: layout === 'vertical' ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}
            >
              <BarChart3 size={13} /> Columns
            </button>
            <button
              onClick={() => setLayout('horizontal')}
              title="Horizontal Bars"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: layout === 'horizontal' ? 'var(--accent-primary)' : 'transparent',
                color: layout === 'horizontal' ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}
            >
              <AlignLeft size={13} /> Bars
            </button>
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Total votes: <strong style={{ color: 'var(--text-primary)' }}>{totalVotes}</strong>
        </div>
      </div>

      {/* 1. Mentimeter Classic Vertical Column Chart */}
      {layout === 'vertical' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-around',
            paddingTop: '24px',
            paddingBottom: '16px',
            gap: '16px',
          }}
        >
          {options.map((opt, idx) => {
            const percentage = totalVotes > 0 ? Math.round((opt.count / totalVotes) * 100) : 0;
            // Height proportional to percentage (min 6% for visual presence)
            const heightPercent = totalVotes > 0 ? Math.max((opt.count / maxCount) * 100, 8) : 6;
            const isPulsing = pulsingOptionId === opt.id;
            const gradient = BAR_GRADIENTS_VERTICAL[idx % BAR_GRADIENTS_VERTICAL.length];

            return (
              <div
                key={opt.id}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  maxWidth: '140px',
                }}
              >
                {/* Dedicated Bar Track (Upper Stage) */}
                <div
                  style={{
                    height: '240px',
                    width: '100%',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                  }}
                >
                  {/* Floating Percentage Badge strictly on top of column bar */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: `calc(${heightPercent}% + 12px)`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      transition: 'bottom 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      zIndex: 2,
                    }}
                  >
                    {isPulsing && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-24px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: '#10b981',
                          animation: 'floatUp 1s ease-out forwards',
                        }}
                      >
                        +1
                      </span>
                    )}

                    <div
                      style={{
                        background: isPulsing ? 'var(--accent-primary)' : 'var(--bg-card)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        textAlign: 'center',
                        boxShadow: isPulsing
                          ? '0 0 16px rgba(99, 102, 241, 0.6)'
                          : '0 4px 12px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {percentage}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {opt.count} {opt.count === 1 ? 'vote' : 'votes'}
                      </div>
                    </div>
                  </div>

                  {/* Animated Rising Column Bar */}
                  <div
                    style={{
                      width: '100%',
                      height: `${heightPercent}%`,
                      minHeight: '18px',
                      background: gradient,
                      borderRadius: '12px 12px 4px 4px',
                      boxShadow: isPulsing
                        ? '0 0 24px rgba(99, 102, 241, 0.5), inset 0 0 12px rgba(255, 255, 255, 0.4)'
                        : '0 4px 14px rgba(0, 0, 0, 0.15)',
                      transition: 'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Subtle Shimmer Ray */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'rgba(255, 255, 255, 0.5)',
                        borderRadius: '12px 12px 0 0',
                      }}
                    />
                  </div>
                </div>

                {/* Ground Axis Line Separating Column Track from Labels */}
                <div
                  style={{
                    width: '100%',
                    height: '2px',
                    background: 'var(--border-strong)',
                    marginTop: '2px',
                    marginBottom: '16px',
                  }}
                />

                {/* Bottom Option Letter and Label (Generous gap, completely separate from bar track) */}
                <div
                  style={{
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {opt.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      lineHeight: 1.3,
                      maxWidth: '130px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {opt.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 2. Horizontal Animated Bars */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {options.map((opt, idx) => {
            const percentage = totalVotes > 0 ? Math.round((opt.count / totalVotes) * 100) : 0;
            const isPulsing = pulsingOptionId === opt.id;
            const gradient = BAR_GRADIENTS_HORIZONTAL[idx % BAR_GRADIENTS_HORIZONTAL.length];

            return (
              <div key={opt.id}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '8px',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {opt.label}
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {opt.text}
                    </span>
                    {opt.isCorrect && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <Check size={12} /> Correct
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                    {isPulsing && (
                      <span
                        style={{
                          position: 'absolute',
                          right: '65px',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: '#10b981',
                          animation: 'floatUp 1s ease-out forwards',
                        }}
                      >
                        +1
                      </span>
                    )}
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {percentage}%
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      ({opt.count})
                    </span>
                  </div>
                </div>

                <div className="bar-track" style={{ height: '48px' }}>
                  <div
                    className="bar-fill"
                    style={{
                      width: `${percentage}%`,
                      background: gradient,
                      opacity: percentage > 0 ? 1 : 0.05,
                      boxShadow: isPulsing ? '0 0 18px rgba(99, 102, 241, 0.6)' : 'none',
                      transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating +1 animation CSS */}
      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-24px) scale(1.3);
          }
        }
      `}</style>
    </div>
  );
}
