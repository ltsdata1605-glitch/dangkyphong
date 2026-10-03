import React, { useEffect, useState } from 'react';
import { Trip, Room } from '../types';
import { formatRemainingTime } from '../utils/textUtils';
import { Clock, Lock, CheckCircle2, MapPin, Building2, CalendarDays, Bed } from 'lucide-react';

interface CountdownBannerProps {
  trip: Trip;
  totalRoomsCount?: number;
  rooms?: Room[];
  onOpenAllRooms?: () => void;
}

export const CountdownBanner: React.FC<CountdownBannerProps> = ({
  trip,
  totalRoomsCount,
  rooms,
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
      margin: '8px 0 12px 0'
    }}>
      <div className="glass-card countdown-banner-card" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        borderLeft: isLocked ? '4px solid var(--color-danger)' : '4px solid var(--primary-500)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Trip Overview */}
        <div style={{ flex: '1 1 auto', minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 className="countdown-trip-title">
              {trip.name}
            </h2>
            {isLocked ? (
              <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                <Lock size={11} /> Đã khóa đăng ký
              </span>
            ) : (
              <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                <CheckCircle2 size={11} /> Đang mở đăng ký
              </span>
            )}
          </div>

          <div className="countdown-trip-details">
            {trip.hotelName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Building2 size={13} style={{ color: 'var(--primary-500)' }} /> {trip.hotelName}
              </span>
            )}
            {trip.location && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} style={{ color: 'var(--color-danger)' }} /> {trip.location}
              </span>
            )}
            {trip.startDate && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CalendarDays size={13} style={{ color: 'var(--color-warning)' }} /> {trip.startDate} - {trip.endDate}
              </span>
            )}
          </div>

          {/* Định mức phòng & Số lượng đã đăng ký */}
          {trip.roomLimits && (
            <div className="countdown-room-limits">
              <span className="room-limit-heading" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Bed size={13} style={{ color: 'var(--primary-500)' }} /> Định mức:
              </span>
              {[2, 3, 4, 5, 6].map(cap => {
                const limit = trip.roomLimits?.[cap];
                if (limit === undefined) return null;
                const count = (rooms || []).filter(r => r.tripId === trip.id && r.capacity === cap && r.memberIds && r.memberIds.length > 0).length;
                const isFull = count >= limit;
                const remaining = Math.max(0, limit - count);

                return (
                  <span
                    key={cap}
                    className={`room-quota-chip ${isFull ? 'is-full' : count > 0 ? 'has-rooms' : ''}`}
                  >
                    <span className="quota-label-long">Phòng {cap} người:</span>
                    <span className="quota-label-short">P.{cap}:</span>
                    <strong style={{ color: isFull ? 'var(--color-danger)' : count > 0 ? 'var(--primary-600)' : 'var(--text-muted)' }}>
                      {count}/{limit}
                    </strong>
                    {isFull ? (
                      <span className="quota-tag-full">
                        ĐÃ ĐỦ
                      </span>
                    ) : (
                      <span className="quota-tag-remaining">
                        (Còn {remaining})
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Area: Nút Xem phòng & Hạn chót (Gọn gàng, vừa vặn) */}
        <div className="countdown-banner-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Nút XEM PHÒNG ĐÃ ĐĂNG KÝ (Nhỏ gọn, nổi bật) */}
          {onOpenAllRooms && (
            <button
              type="button"
              onClick={onOpenAllRooms}
              className="btn-view-rooms-badge hover-lift"
              style={{
                fontWeight: 700,
                fontSize: '0.8rem',
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #f87171 0%, #fb7185 50%, #f43f5e 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 2px 10px rgba(244, 63, 94, 0.35)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                letterSpacing: '0.2px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              title="Xem danh sách tất cả các phòng đã được sắp xếp và tra cứu nhanh"
            >
              <Bed size={15} style={{ color: '#ffffff' }} />
              <span>XEM PHÒNG ĐÃ ĐĂNG KÝ</span>
              {totalRoomsCount !== undefined && (
                <span style={{
                  background: 'rgba(255, 255, 255, 0.28)',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}>
                  {totalRoomsCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
