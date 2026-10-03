import React, { useState, useEffect } from 'react';
import { Trip } from '../types';
import { Hotel, User, ShieldCheck, Sun, Moon, Calendar, ChevronDown, Clock, Lock } from 'lucide-react';
import { formatRemainingTime } from '../utils/textUtils';

interface NavbarProps {
  currentTrip?: Trip | null;
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  activeRole: 'EMPLOYEE' | 'ADMIN';
  onSwitchRole: (role: 'EMPLOYEE' | 'ADMIN') => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  loggedInEmployeeName?: string;
  onLogoutEmployee?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTrip,
  trips,
  onSelectTrip,
  activeRole,
  onSwitchRole,
  isDarkMode,
  onToggleTheme,
  loggedInEmployeeName,
  onLogoutEmployee
}) => {
  const [timeLeft, setTimeLeft] = useState(() => formatRemainingTime(currentTrip?.deadline || ''));

  useEffect(() => {
    setTimeLeft(formatRemainingTime(currentTrip?.deadline || ''));
    const interval = setInterval(() => {
      setTimeLeft(formatRemainingTime(currentTrip?.deadline || ''));
    }, 60000);
    return () => clearInterval(interval);
  }, [currentTrip?.deadline]);

  const isLocked = currentTrip?.isLocked || timeLeft.isExpired;

  return (
    <header className="navbar-header" style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      background: 'var(--glass-bg)',
      borderBottom: 'var(--glass-border)',
      padding: '12px 16px',
      transition: 'all 0.2s ease'
    }}>
      <div className="navbar-container" style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8
      }}>
        {/* Brand & Active Trip Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="navbar-brand-logo" style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.35)',
            flexShrink: 0
          }}>
            <Hotel size={20} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="navbar-brand-title" style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: '1.12rem',
                letterSpacing: '-0.02em',
                background: 'var(--primary-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                ĐĂNG KÝ PHÒNG
              </span>
              <span className="badge badge-primary navbar-version-badge" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>v1.0</span>
              <span className="badge badge-success navbar-live-badge" style={{ fontSize: '0.62rem', padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Dữ liệu đồng bộ thời gian thực qua Firebase Firestore">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                Firebase Live
              </span>
            </div>

            {/* Trip Dropdown Selector & Countdown Deadline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <select
                    value={currentTrip?.id || ''}
                    onChange={(e) => onSelectTrip(e.target.value)}
                    className="navbar-trip-select"
                    style={{
                      appearance: 'none',
                      background: 'transparent',
                      border: 'none',
                      fontFamily: 'var(--font-heading)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      paddingRight: 16,
                      outline: 'none',
                      maxWidth: 'min(420px, 55vw)',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    }}
                    title="Chọn đợt / chuyến du lịch"
                  >
                    {trips.length === 0 ? (
                      <option value="" disabled style={{ background: 'var(--bg-card-solid)', color: 'var(--text-muted)' }}>
                        Chưa có chuyến đi
                      </option>
                    ) : (
                      trips.map(t => (
                        <option key={t.id} value={t.id} style={{ background: 'var(--bg-card-solid)', color: 'var(--text-main)' }}>
                          {t.name}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={11} style={{ position: 'absolute', right: 1, top: 4, pointerEvents: 'none', color: 'var(--text-muted)' }} />
                </div>
              </div>

              {/* Hạn chót đăng ký - Nằm bên phải tên tour theo đúng yêu cầu */}
              {currentTrip && (
                <div
                  className="navbar-deadline-box"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: isLocked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(37, 99, 235, 0.08)',
                    border: isLocked ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(37, 99, 235, 0.25)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                  title={currentTrip.isLocked ? 'BTC đã khóa đăng ký' : `Hạn chót đăng ký: ${currentTrip.deadline || 'Chưa thiết lập'}`}
                >
                  {isLocked ? (
                    <Lock size={12} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                  ) : (
                    <Clock size={12} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Hạn chót:</span>
                  <strong style={{
                    color: isLocked ? 'var(--color-danger)' : 'var(--primary-600)',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800
                  }}>
                    {currentTrip.isLocked ? 'Đã khóa' : timeLeft.text}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Employee status if logged in */}
          {activeRole === 'EMPLOYEE' && loggedInEmployeeName && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-muted)',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--color-success)',
                boxShadow: '0 0 6px var(--color-success)'
              }} />
              <span style={{ color: 'var(--text-main)', maxWidth: 100, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {loggedInEmployeeName}
              </span>
              <button
                onClick={onLogoutEmployee}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-danger)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginLeft: 2
                }}
                title="Đăng xuất"
              >
                (Đổi)
              </button>
            </div>
          )}

          {/* Role Toggle Button */}
          <button
            onClick={() => onSwitchRole(activeRole === 'EMPLOYEE' ? 'ADMIN' : 'EMPLOYEE')}
            className={`btn btn-sm navbar-role-btn ${activeRole === 'ADMIN' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700 }}
          >
            {activeRole === 'ADMIN' ? (
              <>
                <ShieldCheck size={15} />
                <span>Admin BTC</span>
              </>
            ) : (
              <>
                <User size={15} />
                <span>Nhân Viên</span>
              </>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="btn btn-secondary btn-sm navbar-theme-btn"
            style={{ padding: '6px 8px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            title={isDarkMode ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
          >
            {isDarkMode ? <Sun size={15} style={{ color: '#f59e0b' }} /> : <Moon size={15} style={{ color: '#64748b' }} />}
          </button>
        </div>
      </div>
    </header>
  );
};
