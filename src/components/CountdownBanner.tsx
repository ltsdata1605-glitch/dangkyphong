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
      <div className="glass-card" style={{
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        borderLeft: isLocked ? '4px solid var(--color-danger)' : '4px solid var(--primary-500)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Trip Overview (Gọn gàng trên 2 dòng thanh mảnh) */}
        <div style={{ flex: '1 1 auto', minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: '1.02rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              {trip.name}
            </h2>
            {isLocked ? (
              <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                <Lock size={11} /> Đã khóa đăng ký
              </span>
            ) : (
              <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                <CheckCircle2 size={11} /> Đang mở đăng ký
              </span>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            marginTop: 3
          }}>
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              fontSize: '0.78rem',
              marginTop: 6,
              paddingTop: 6,
              borderTop: '1px dashed var(--border-subtle)'
            }}>
              <span style={{ fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Bed size={13} style={{ color: 'var(--primary-500)' }} /> Định mức phòng:
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
                    style={{
                      background: isFull ? 'rgba(239, 68, 68, 0.08)' : count > 0 ? 'rgba(37, 99, 235, 0.07)' : 'var(--bg-card-solid)',
                      border: isFull ? '1px solid rgba(239, 68, 68, 0.35)' : count > 0 ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid var(--border-subtle)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: isFull ? 'var(--color-danger)' : 'var(--text-main)',
                      fontWeight: 600
                    }}
                  >
                    <span>Phòng {cap} người:</span>
                    <strong style={{ color: isFull ? 'var(--color-danger)' : count > 0 ? 'var(--primary-600)' : 'var(--text-muted)' }}>
                      {count}/{limit}
                    </strong>
                    {isFull ? (
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        color: '#fff',
                        background: 'var(--color-danger)',
                        padding: '1px 5px',
                        borderRadius: 4
                      }}>
                        ĐÃ ĐỦ
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Nút XEM PHÒNG ĐÃ ĐĂNG KÝ (Nhỏ gọn, nổi bật) */}
          {onOpenAllRooms && (
            <button
              type="button"
              onClick={onOpenAllRooms}
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
              className="hover-lift"
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

          {/* Countdown Box (Gọn gàng) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            borderRadius: 'var(--radius-md)',
            background: isLocked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(37, 99, 235, 0.08)',
            border: isLocked ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(37, 99, 235, 0.2)'
          }}>
            <Clock size={16} style={{ color: isLocked ? 'var(--color-danger)' : 'var(--primary-500)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.1 }}>
                Hạn chót đăng ký
              </div>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: '0.88rem',
                lineHeight: 1.2,
                color: isLocked ? 'var(--color-danger)' : 'var(--primary-500)'
              }}>
                {trip.isLocked ? 'BTC đã khóa' : timeLeft.text}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
