'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';

interface WordItem {
  text: string;
  count: number;
}

interface WordCloudProps {
  words: WordItem[];
  totalResponses: number;
}

const PALETTE = [
  { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.4)', text: '#a5b4fc' },
  { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.4)', text: '#67e8f9' },
  { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#6ee7b7' },
  { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#fcd34d' },
  { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.4)', text: '#f472b6' },
  { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.4)', text: '#c4b5fd' },
];

export default function WordCloud({ words, totalResponses }: WordCloudProps) {
  if (!words || words.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '280px',
          padding: '40px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          border: '2px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <MessageSquare size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Waiting for first word submissions...</p>
        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Audience responses will assemble here in real time.</p>
      </div>
    );
  }

  // Calculate size scaling
  const maxCount = Math.max(...words.map((w) => w.count), 1);
  const minCount = Math.min(...words.map((w) => w.count), 1);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        padding: '30px 20px',
        minHeight: '300px',
        background: 'rgba(18, 22, 31, 0.5)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {words.map((item, index) => {
        const theme = PALETTE[index % PALETTE.length];
        // Scale font size between 1.1rem and 2.4rem
        const scale = maxCount === minCount ? 1 : (item.count - minCount) / (maxCount - minCount);
        const fontSize = 1.1 + scale * 1.3;

        return (
          <div
            key={item.text}
            className="word-pill"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.border,
              color: theme.text,
              fontSize: `${fontSize.toFixed(2)}rem`,
              padding: `${8 + scale * 8}px ${16 + scale * 12}px`,
              transition: 'all 0.3s ease',
              boxShadow: scale > 0.5 ? '0 4px 20px rgba(99, 102, 241, 0.25)' : 'none',
            }}
          >
            <span>{item.text}</span>
            {item.count > 1 && (
              <span
                style={{
                  fontSize: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  marginLeft: '4px',
                  fontWeight: 700,
                }}
              >
                ×{item.count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
