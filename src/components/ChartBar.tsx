'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface ChartBarProps {
  label: string;
  optionText: string;
  count: number;
  totalVotes: number;
  index: number;
  isCorrect?: boolean;
}

const BAR_COLORS = [
  'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)',
  'linear-gradient(90deg, #06b6d4 0%, #22d3ee 100%)',
  'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
  'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
  'linear-gradient(90deg, #ec4899 0%, #f472b6 100%)',
  'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
];

export default function ChartBar({
  label,
  optionText,
  count,
  totalVotes,
  index,
  isCorrect,
}: ChartBarProps) {
  const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
  const gradient = BAR_COLORS[index % BAR_COLORS.length];

  return (
    <div style={{ marginBottom: '16px' }}>
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
            {label}
          </span>
          <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {optionText}
          </span>
          {isCorrect && (
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            {percentage}%
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            ({count})
          </span>
        </div>
      </div>

      <div className="bar-track">
        <div
          className="bar-fill"
          style={{
            width: `${percentage}%`,
            background: gradient,
            opacity: percentage > 0 ? 1 : 0.05,
          }}
        />
      </div>
    </div>
  );
}
