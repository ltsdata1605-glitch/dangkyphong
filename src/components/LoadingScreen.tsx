import React, { useState, useEffect } from 'react';
import { Building, Sparkles, Database, ShieldCheck } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    'Kết nối cơ sở dữ liệu Firebase Realtime...',
    'Đang tải danh sách các chuyến đi & khách sạn...',
    'Đang đồng bộ sơ đồ phòng và người tham gia...',
    'Đang hoàn tất chuẩn bị giao diện...'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 900);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main, #f8fafc)',
      color: 'var(--text-main, #0f172a)',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      padding: '24px'
    }}>
      {/* Background ambient glow */}
      <div style={{
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0) 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: 460,
        width: '100%',
        padding: '36px 28px',
        borderRadius: '24px',
        background: 'var(--card-bg, rgba(255, 255, 255, 0.85))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-subtle, rgba(226, 232, 240, 0.8))',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08)'
      }}>
        {/* Animated App Icon */}
        <div style={{
          position: 'relative',
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
          marginBottom: 20,
          animation: 'pulse 2s infinite ease-in-out'
        }}>
          <Building size={34} />
          <div style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#22c55e',
            border: '2px solid #ffffff'
          }} />
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          margin: '0 0 6px 0',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          HỆ THỐNG ĐĂNG KÝ PHÒNG
        </h2>

        {/* Subtitle */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.82rem',
          color: 'var(--text-muted, #64748b)',
          marginBottom: 24
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <span>Firebase Realtime Cloud Sync</span>
        </div>

        {/* Progress Bar Container */}
        <div style={{
          width: '100%',
          height: 6,
          borderRadius: 99,
          background: 'var(--border-subtle, #e2e8f0)',
          overflow: 'hidden',
          marginBottom: 16,
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${Math.min(100, (stepIndex + 1) * 26)}%`,
            background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
            borderRadius: 99,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>

        {/* Dynamic Status Text */}
        <div style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text-main, #334155)',
          minHeight: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6
        }}>
          <Sparkles size={14} style={{ color: 'var(--primary-500, #2563eb)' }} />
          <span>{message || steps[stepIndex]}</span>
        </div>

        {/* Badges footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginTop: 22,
          paddingTop: 16,
          borderTop: '1px solid var(--border-subtle, #e2e8f0)',
          fontSize: '0.75rem',
          color: 'var(--text-muted, #94a3b8)'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Database size={12} /> Dữ liệu trực tuyến
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ShieldCheck size={12} /> Đảm bảo toàn vẹn
          </span>
        </div>
      </div>
    </div>
  );
};
