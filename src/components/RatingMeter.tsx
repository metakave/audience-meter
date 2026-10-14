'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface RatingMeterProps {
  average: number;
  totalVotes: number;
  ratingCounts: Record<number, number>;
  minRating?: number;
  maxRating?: number;
}

export default function RatingMeter({
  average,
  totalVotes,
  ratingCounts,
  minRating = 1,
  maxRating = 5,
}: RatingMeterProps) {
  const ratings = [];
  for (let i = minRating; i <= maxRating; i++) {
    ratings.push(i);
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '28px',
        alignItems: 'center',
        padding: '32px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Big Average Card */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px',
          background: 'rgba(99, 102, 241, 0.08)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', marginBottom: '8px' }}>
          <Star size={32} fill="#fbbf24" />
          <span style={{ fontSize: '3.6rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>
            {average > 0 ? average.toFixed(1) : '—'}
          </span>
        </div>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Average Score (out of {maxRating})
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          {totalVotes} {totalVotes === 1 ? 'rating' : 'ratings'} submitted
        </div>
      </div>

      {/* Distribution Bars */}
      <div>
        <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Score Breakdown
        </div>
        {ratings.reverse().map((rating) => {
          const count = ratingCounts[rating] || 0;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

          return (
            <div
              key={rating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '10px',
              }}
            >
              <span style={{ width: '40px', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {rating} ★
              </span>
              <div
                style={{
                  flex: 1,
                  height: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${percentage}%`,
                    background: 'linear-gradient(90deg, #6366f1, #38bdf8)',
                    borderRadius: '9999px',
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
              <span style={{ width: '48px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                {count} ({percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
