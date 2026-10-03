import React from 'react';
import { Trip } from '../types';
import { Hotel, User, ShieldCheck, Sun, Moon, Calendar, ChevronDown } from 'lucide-react';

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
  return (
    <header style={{
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
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Brand & Active Trip Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.35)'
          }}>
            <Hotel size={22} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: '1.15rem',
                letterSpacing: '-0.02em',
                background: 'var(--primary-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                ĐĂNG KÝ PHÒNG
              </span>
              <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>v1.0</span>
              <span className="badge badge-success" style={{ fontSize: '0.62rem', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Dữ liệu đồng bộ thời gian thực qua Firebase Firestore">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                Firebase Live
              </span>
            </div>

            {/* Trip Dropdown Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <select
                  value={currentTrip?.id || ''}
                  onChange={(e) => onSelectTrip(e.target.value)}
                  style={{
                    appearance: 'none',
                    background: 'transparent',
                    border: 'none',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    paddingRight: 18,
                    outline: 'none',
                    maxWidth: 220,
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
                <ChevronDown size={12} style={{ position: 'absolute', right: 2, top: 4, pointerEvents: 'none', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Employee status if logged in */}
          {activeRole === 'EMPLOYEE' && loggedInEmployeeName && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-muted)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--color-success)',
                boxShadow: '0 0 8px var(--color-success)'
              }} />
              <span style={{ color: 'var(--text-main)', maxWidth: 120, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {loggedInEmployeeName}
              </span>
              <button
                onClick={onLogoutEmployee}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-danger)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginLeft: 4
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
            className={`btn btn-sm ${activeRole === 'ADMIN' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700 }}
          >
            {activeRole === 'ADMIN' ? (
              <>
                <ShieldCheck size={16} />
                <span>Admin BTC</span>
              </>
            ) : (
              <>
                <User size={16} />
                <span>Nhân Viên</span>
              </>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="btn btn-secondary btn-sm"
            style={{ padding: 8, borderRadius: 'var(--radius-full)' }}
            title={isDarkMode ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
          >
            {isDarkMode ? <Sun size={17} style={{ color: '#f59e0b' }} /> : <Moon size={17} style={{ color: '#64748b' }} />}
          </button>
        </div>
      </div>
    </header>
  );
};
