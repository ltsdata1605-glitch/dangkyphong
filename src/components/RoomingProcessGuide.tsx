import React, { useState } from 'react';
import { HeartHandshake, PlusCircle, Users, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface RoomingProcessGuideProps {
  onOpenCreateRoom?: () => void;
  hasRoom?: boolean;
}

export const RoomingProcessGuide: React.FC<RoomingProcessGuideProps> = ({
  onOpenCreateRoom,
  hasRoom = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{
      marginBottom: 14,
      borderRadius: 'var(--radius-md)',
      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)',
      border: '1px solid rgba(37, 99, 235, 0.2)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden'
    }}>
      {/* Thanh Tóm Tắt Siêu Gọn (1 Dòng) */}
      <div style={{
        padding: '7px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        fontSize: '0.82rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <span className="badge badge-primary" style={{ fontSize: '0.72rem', padding: '2px 8px', fontWeight: 700, flexShrink: 0 }}>
            3 Bước Đăng Ký
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', color: 'var(--text-main)', fontSize: '0.82rem' }}>
            <span><strong>1.</strong> Nhận người thân</span>
            <span style={{ color: 'var(--primary-600)', fontWeight: 800 }}>→</span>
            <span><strong>2.</strong> Tự tạo phòng 2 người</span>
            <span style={{ color: 'var(--primary-600)', fontWeight: 800 }}>→</span>
            <span><strong>3.</strong> Ghép thêm người</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '0.74rem',
              color: '#b45309',
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '1px 7px',
              borderRadius: 4,
              marginLeft: 4,
              fontWeight: 600
            }}>
              📌 Bé &lt; 12t: 0 suất (ở cùng)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary-600)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 6px',
            fontWeight: 600,
            flexShrink: 0
          }}
        >
          {isExpanded ? (
            <>Thu gọn <ChevronUp size={14} /></>
          ) : (
            <>Xem chi tiết <ChevronDown size={14} /></>
          )}
        </button>
      </div>

      {/* Chi tiết 3 bước (Chỉ hiển thị khi bấm Xem chi tiết) */}
      {isExpanded && (
        <div style={{
          padding: '12px 14px 14px 14px',
          borderTop: '1px solid rgba(37, 99, 235, 0.12)',
          background: 'rgba(255, 255, 255, 0.6)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 10,
            marginBottom: 10
          }}>
            {/* Step 1 */}
            <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-solid)', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4, color: 'var(--text-main)' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#f59e0b', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>1</span>
                <HeartHandshake size={14} style={{ color: '#f59e0b' }} />
                Chọn Người Thân
              </div>
              <div style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Bấm <strong>"Nhận"</strong> → Chọn mối quan hệ (Vợ/Chồng, Con, Ba/Mẹ...).
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-solid)', border: '1px solid rgba(37, 99, 235, 0.25)', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4, color: 'var(--text-main)' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--primary-500)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>2</span>
                <PlusCircle size={14} style={{ color: 'var(--primary-500)' }} />
                Tự Động Tạo Phòng
              </div>
              <div style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Hệ thống <strong>tự động tạo ngay phòng 2 người</strong> với người thân.
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-solid)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4, color: 'var(--text-main)' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-success)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>3</span>
                <Users size={14} style={{ color: 'var(--color-success)' }} />
                Ghép Thêm Người Ở Cùng
              </div>
              <div style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Nếu đi theo nhóm cần phòng lớn hơn (3–6 người), bấm <strong>"Sửa Phòng"</strong> để thêm đồng nghiệp.
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.76rem', color: '#b45309', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
            📌 <strong>Ghi chú quan trọng:</strong> Bé &lt; 12 tuổi (dưới 5 tuổi hoặc 5–11 tuổi) ở cùng người thân, <strong>không tính vào số lượng người trong phòng</strong> (0 suất).
          </div>
        </div>
      )}
    </div>
  );
};
