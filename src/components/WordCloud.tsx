'use client';

import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';

interface WordItem {
  text: string;
  count: number;
}

interface WordCloudProps {
  words: WordItem[];
  totalResponses: number;
}

const PALETTE = [
  { bg: 'rgba(99, 102, 241, 0.16)', border: 'rgba(99, 102, 241, 0.45)', text: '#818cf8' },
  { bg: 'rgba(6, 182, 212, 0.16)', border: 'rgba(6, 182, 212, 0.45)', text: '#22d3ee' },
  { bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.45)', text: '#34d399' },
  { bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.45)', text: '#fbbf24' },
  { bg: 'rgba(236, 72, 153, 0.16)', border: 'rgba(236, 72, 153, 0.45)', text: '#f472b6' },
  { bg: 'rgba(139, 92, 246, 0.16)', border: 'rgba(139, 92, 246, 0.45)', text: '#a78bfa' },
];

export default function WordCloud({ words, totalResponses }: WordCloudProps) {
  if (!words || words.length === 0) {
    return (
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '320px',
          padding: '40px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          borderRadius: 'var(--radius-lg)',
          border: '2px dashed var(--border-subtle)',
        }}
      >
        <MessageSquare size={40} style={{ marginBottom: '14px', opacity: 0.5 }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Waiting for Audience Words...
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Submit words from your device to watch the word cloud assemble and grow in real time.
        </p>
      </div>
    );
  }

  // Calculate size scaling
  const maxCount = Math.max(...words.map((w) => w.count), 1);
  const minCount = Math.min(...words.map((w) => w.count), 1);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '36px 28px',
        borderRadius: 'var(--radius-lg)',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          <Sparkles size={16} color="var(--accent-primary)" />
          <span>Live Interactive Word Cloud</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{totalResponses}</strong> words submitted
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px 10px',
          minHeight: '260px',
        }}
      >
        {words.map((item, index) => {
          const theme = PALETTE[index % PALETTE.length];
          // Scale font size between 1.15rem and 2.6rem
          const scale = maxCount === minCount ? 1 : (item.count - minCount) / (maxCount - minCount);
          const fontSize = 1.15 + scale * 1.45;

          return (
            <div
              key={`${item.text}_${item.count}`}
              className="word-pill"
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
                color: theme.text,
                fontSize: `${fontSize.toFixed(2)}rem`,
                padding: `${8 + scale * 8}px ${18 + scale * 14}px`,
                fontWeight: 800,
                letterSpacing: '-0.3px',
                animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: scale > 0.4 ? '0 6px 24px rgba(99, 102, 241, 0.28)' : '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'all 0.4s ease',
              }}
            >
              <span>{item.text}</span>
              {item.count > 1 && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.35)',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    marginLeft: '8px',
                    fontWeight: 800,
                  }}
                >
                  ×{item.count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
