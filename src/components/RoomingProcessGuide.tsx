import React from 'react';
import { HeartHandshake, PlusCircle, Users, Info, Sparkles, CheckCircle2 } from 'lucide-react';

interface RoomingProcessGuideProps {
  onOpenCreateRoom?: () => void;
  hasRoom?: boolean;
}

export const RoomingProcessGuide: React.FC<RoomingProcessGuideProps> = ({
  onOpenCreateRoom,
  hasRoom = false
}) => {
  return (
    <div style={{
      marginBottom: 20,
      padding: '20px 24px',
      borderRadius: 'var(--radius-lg)',
      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, rgba(245, 158, 11, 0.05) 100%)',
      border: '1px solid rgba(37, 99, 235, 0.18)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Hướng Dẫn Đăng Ký Phòng (3 Bước Đơn Giản)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Quy trình chuẩn giúp bạn tự xếp phòng và ghép người thân nhanh chóng
            </p>
          </div>
        </div>

        <span className="badge badge-primary" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
          3 Bước Tự Đăng Ký
        </span>
      </div>

      {/* 3 Step Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 12,
        marginBottom: 16
      }}>
        {/* Step 1 */}
        <div style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card-solid)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#f59e0b',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 800
            }}>
              1
            </span>
            <HeartHandshake size={18} style={{ color: '#f59e0b' }} />
            <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
              Chọn Người Thân
            </strong>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Bấm <strong>"Nhận"</strong> người thân của bạn (cùng siêu thị hoặc nhập tìm ở siêu thị khác) $\to$ <strong>Chọn mối quan hệ</strong> khi thêm (Vợ/Chồng, Con, Ba/Mẹ...).
          </div>
        </div>

        {/* Step 2 */}
        <div style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card-solid)',
          border: '1px solid rgba(37, 99, 235, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--primary-500)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 800
            }}>
              2
            </span>
            <PlusCircle size={18} style={{ color: 'var(--primary-500)' }} />
            <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
              Tự Động Tạo Phòng
            </strong>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Khi nhận người thân, hệ thống sẽ <strong>tự động tạo ngay phòng 2 người</strong> với người thân (hoặc bấm <em>"Tạo Phòng Mới"</em> nếu ở cùng đồng nghiệp).
          </div>
        </div>

        {/* Step 3 */}
        <div style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card-solid)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--color-success)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 800
            }}>
              3
            </span>
            <Users size={18} style={{ color: 'var(--color-success)' }} />
            <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
              Ghép Thêm Người Ở Cùng
            </strong>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Phòng đã có bạn và người thân. Nếu đi theo nhóm cần phòng lớn hơn (3–6 người), bạn có thể bấm <strong>"Sửa Phòng"</strong> để chọn thêm đồng nghiệp.
          </div>
        </div>
      </div>

      {/* Crucial Note Box Requested by User */}
      <div style={{
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10
      }}>
        <Info size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
          <strong style={{ color: '#b45309' }}>📌 Ghi chú quan trọng:</strong>{' '}
          <strong>Nếu bé &lt; 11 tuổi</strong> (Con dưới 5 tuổi hoặc Con 5–11 tuổi) sẽ <strong>không tính vào số lượng người trong phòng</strong> (ngủ cùng người thân/bố mẹ).
        </div>
      </div>
    </div>
  );
};
