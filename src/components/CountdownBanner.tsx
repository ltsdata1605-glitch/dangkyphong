import React, { useEffect, useState } from 'react';
import { Trip } from '../types';
import { formatRemainingTime } from '../utils/textUtils';
import { Clock, Lock, CheckCircle2, MapPin, Building2, CalendarDays, Bed } from 'lucide-react';

interface CountdownBannerProps {
  trip: Trip;
  totalRoomsCount?: number;
  onOpenAllRooms?: () => void;
}

export const CountdownBanner: React.FC<CountdownBannerProps> = ({
  trip,
  totalRoomsCount,
  onOpenAllRooms
}) => {
  const [timeLeft, setTimeLeft] = useState(formatRemainingTime(trip.deadline));

  useEffect(() => {
    setTimeLeft(formatRemainingTime(trip.deadline));
    const interval = setInterval(() => {
      setTimeLeft(formatRemainingTime(trip.deadline));
    }, 60000);
    return () => clearInterval(interval);
  }, [trip.deadline]);

  const isLocked = trip.isLocked || timeLeft.isExpired;

  return (
    <div style={{
      width: '100%',
      margin: '16px 0'
    }}>
      <div className="glass-card" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        borderLeft: isLocked ? '4px solid var(--color-danger)' : '4px solid var(--primary-500)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Trip Overview */}
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              {trip.name}
            </h2>
            {isLocked ? (
              <span className="badge badge-danger">
                <Lock size={12} /> Đã khóa đăng ký
              </span>
            ) : (
              <span className="badge badge-success">
                <CheckCircle2 size={12} /> Đang mở đăng ký
              </span>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14,
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginTop: 6
          }}>
            {trip.hotelName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Building2 size={14} style={{ color: 'var(--primary-500)' }} /> {trip.hotelName}
              </span>
            )}
            {trip.location && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={14} style={{ color: 'var(--color-danger)' }} /> {trip.location}
              </span>
            )}
            {trip.startDate && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CalendarDays size={14} style={{ color: 'var(--color-warning)' }} /> {trip.startDate} - {trip.endDate}
              </span>
            )}
          </div>
        </div>

        {/* Nút Xem Danh Sách Phòng (Vị trí theo hộp đỏ yêu cầu) */}
        {onOpenAllRooms && (
          <button
            type="button"
            onClick={onOpenAllRooms}
            className="btn btn-primary"
            style={{
              fontWeight: 700,
              fontSize: '0.88rem',
              padding: '9px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
              borderRadius: 'var(--radius-md)',
              whiteSpace: 'nowrap'
            }}
            title="Xem danh sách tất cả các phòng đã được sắp xếp và tra cứu nhanh"
          >
            <Bed size={17} /> Danh Sách Phòng {totalRoomsCount !== undefined ? `(${totalRoomsCount})` : ''}
          </button>
        )}

        {/* Countdown Box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          background: isLocked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(37, 99, 235, 0.08)',
          border: isLocked ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(37, 99, 235, 0.2)'
        }}>
          <Clock size={20} style={{ color: isLocked ? 'var(--color-danger)' : 'var(--primary-500)' }} />
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
              Hạn chót đăng ký
            </div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1.05rem',
              color: isLocked ? 'var(--color-danger)' : 'var(--primary-500)'
            }}>
              {trip.isLocked ? 'BTC đã khóa' : timeLeft.text}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
