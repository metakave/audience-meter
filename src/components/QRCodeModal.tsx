'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, ExternalLink } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export default function QRCodeModal({ isOpen, onClose, roomCode }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [joinUrl, setJoinUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/join/${roomCode}`;
      setJoinUrl(url);
      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [roomCode]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '32px',
          textAlign: 'center',
          position: 'relative',
          background: '#12161f',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            color: 'var(--text-muted)',
            padding: '6px',
          }}
        >
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
          Scan to Join
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Point your phone camera to participate immediately
        </p>

        {qrDataUrl ? (
          <div
            style={{
              background: '#ffffff',
              padding: '16px',
              borderRadius: '16px',
              display: 'inline-block',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
              marginBottom: '20px',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR Code for room ${roomCode}`}
              style={{ width: '220px', height: '220px', display: 'block' }}
            />
          </div>
        ) : (
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Generating QR code...</span>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
            Room Code
          </div>
          <div className="code-pill" style={{ fontSize: '1.6rem', padding: '6px 20px' }}>
            {roomCode}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '16px',
            overflow: 'hidden',
          }}
        >
          <span style={{ flex: 1, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {joinUrl}
          </span>
          <button
            onClick={handleCopy}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', flexShrink: 0 }}
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <a
          href={joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{ width: '100%', fontSize: '0.9rem' }}
        >
          <ExternalLink size={16} /> Open Join Link In New Tab
        </a>
      </div>
    </div>
  );
}
