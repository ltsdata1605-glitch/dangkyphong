import React from 'react';
import { Person, Room, Trip } from '../types';
import {
  Users,
  Building,
  Bed,
  AlertTriangle,
  Download,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle,
  Clock,
  Baby
} from 'lucide-react';

interface AdminDashboardProps {
  currentTrip: Trip;
  people: Person[];
  rooms: Room[];
  onExportExcel: () => void;
  onAutoMatch: () => void;
  onToggleLock: () => void;
  onOpenImportModal?: () => void;
  onNavigateTab: (
    tab: 'rooms' | 'people' | 'trips' | 'logs',
    options?: { roomFilter?: 'ALL' | 'ASSIGNED' | 'UNASSIGNED' }
  ) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentTrip,
  people,
  rooms,
  onExportExcel,
  onAutoMatch,
  onToggleLock,
  onOpenImportModal,
  onNavigateTab
}) => {
  // 1. Thống kê nhân sự
  const totalPeople = people.length;
  const employees = people.filter(p => p.type === 'EMPLOYEE');
  const relatives = people.filter(p => p.type === 'RELATIVE');
  const pgs = people.filter(p => p.type === 'PG');

  const assignedPeople = people.filter(p => p.roomId);
  const unassignedPeople = people.filter(p => !p.roomId);

  const percentAssigned = totalPeople > 0 ? Math.round((assignedPeople.length / totalPeople) * 100) : 0;

  // 2. Thống kê phòng theo loại
  const capacityCounts: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let fullRoomsCount = 0;
  let underRoomsCount = 0;

  rooms.forEach(r => {
    if (!r.memberIds || r.memberIds.length === 0) return;
    if (capacityCounts[r.capacity] !== undefined) {
      capacityCounts[r.capacity]++;
    }
    if (r.status === 'FULL') fullRoomsCount++;
    else underRoomsCount++;
  });

  // 3. Phân tích chi tiết nhu cầu suất và cân đối định mức phòng khách sạn
  const totalChildren = people.filter(p => (p.slot ?? 1) === 0).length;
  const adultSlotsNeeded = people.filter(p => (p.slot ?? 1) > 0).length;
  const employeesCount = people.filter(p => p.type === 'EMPLOYEE').length;
  const relativesCount = people.filter(p => p.type === 'RELATIVE').length;
  const pgsCount = people.filter(p => p.type === 'PG').length;

  const roomLimits = currentTrip.roomLimits || {};
  const totalQuotaCapacity = [2, 3, 4, 5, 6].reduce((sum, cap) => sum + cap * (roomLimits[cap] || 0), 0);
  const totalQuotaRooms = [2, 3, 4, 5, 6].reduce((sum, cap) => sum + (roomLimits[cap] || 0), 0);

  const capacityDiff = totalQuotaCapacity - adultSlotsNeeded;
  const isShortage = totalQuotaCapacity > 0 && capacityDiff < 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Top Banner Actions */}
      <div className="glass-card admin-dashboard-banner" style={{
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ flex: '1 1 280px', minWidth: 260 }}>
          <h2 style={{ fontSize: '1.22rem', fontWeight: 800, margin: 0 }}>
            Bảng Điều Khiển Ban Tổ Chức (Admin)
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Quản lý sắp xếp phòng, kiểm soát quy tắc và xuất file Rooming List gửi khách sạn
          </p>
        </div>

        {/* Action Buttons: co giãn linh hoạt và không chèn ép tiêu đề */}
        <div className="admin-banner-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={onExportExcel}
            className="btn btn-success btn-sm"
            style={{ fontWeight: 700, padding: '6px 11px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
            title="Xuất danh sách đã sắp phòng (Excel)"
          >
            <Download size={14} /> Xuất danh sách
          </button>

          <button
            onClick={onAutoMatch}
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 700, padding: '6px 11px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
            title="Hệ thống tự động gom người cùng giới/siêu thị vào các phòng trống"
          >
            <Sparkles size={14} /> Ghép Phòng Tự Động
          </button>

          <button
            onClick={onToggleLock}
            className={`btn ${currentTrip.isLocked ? 'btn-danger' : 'btn-secondary'} btn-sm`}
            style={{ fontWeight: 700, padding: '6px 11px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
            title={currentTrip.isLocked ? 'Mở lại đăng ký phòng' : 'Khóa đăng ký phòng ngay'}
          >
            {currentTrip.isLocked ? (
              <>
                <Lock size={13} /> Đang Khóa (Mở Lại)
              </>
            ) : (
              <>
                <Unlock size={13} /> Đang Mở (Khóa Ngay)
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12 }}>
        {/* Card 1: Tổng người */}
        <div
          className="glass-card glass-card-hover"
          onClick={() => onNavigateTab('people', { roomFilter: 'ALL' })}
          style={{ padding: '10px 14px', cursor: 'pointer' }}
          title="Bấm để xem toàn bộ danh sách người tham gia"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Tổng Người Tham Gia
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            {totalPeople}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {employees.length} NV • {relatives.length} Thân • {pgs.length} PG
          </div>
        </div>

        {/* Card 2: Tiến độ xếp phòng */}
        <div
          className="glass-card glass-card-hover"
          onClick={() => onNavigateTab('people', { roomFilter: 'ASSIGNED' })}
          style={{ padding: '10px 14px', cursor: 'pointer' }}
          title="Bấm để xem danh sách các bạn đã có phòng"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Tiến Độ Xếp Phòng
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={15} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)', lineHeight: 1.2 }}>
            {percentAssigned}%
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Đã có phòng: <strong>{assignedPeople.length}</strong> / {totalPeople}
          </div>
        </div>

        {/* Card 3: Chưa có phòng */}
        <div
          className="glass-card glass-card-hover"
          onClick={() => onNavigateTab('people', { roomFilter: 'UNASSIGNED' })}
          style={{ padding: '10px 14px', cursor: 'pointer' }}
          title="Bấm để lọc danh sách các bạn chưa có phòng"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Chưa Có Phòng
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={15} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: unassignedPeople.length > 0 ? 'var(--color-danger)' : 'var(--text-main)', lineHeight: 1.2 }}>
            {unassignedPeople.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Cần ghép thêm vào các phòng
          </div>
        </div>

        {/* Card 4: Tổng số phòng */}
        <div
          className="glass-card glass-card-hover"
          onClick={() => onNavigateTab('rooms')}
          style={{ padding: '10px 14px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Tổng Số Phòng Đã Tạo
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bed size={15} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            {rooms.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {fullRoomsCount} Đủ • {underRoomsCount} Thiếu
          </div>
        </div>
      </div>

      {/* Thẻ Cảnh Báo & Cân Đối Nhu Cầu vs Định Mức Phòng Khách Sạn */}
      {totalQuotaCapacity > 0 && (
        <div className="glass-card" style={{
          padding: '16px 20px',
          borderLeft: isShortage ? '5px solid var(--color-danger)' : '5px solid var(--color-success)',
          background: isShortage
            ? 'linear-gradient(135deg, rgba(254, 242, 242, 0.9) 0%, rgba(254, 226, 226, 0.6) 100%)'
            : 'linear-gradient(135deg, rgba(240, 253, 244, 0.9) 0%, rgba(220, 252, 231, 0.6) 100%)',
          border: isShortage ? '1px solid #f87171' : '1px solid #86efac'
        }}>
          {/* Header: Trạng thái & Kết luận tổng quan */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className={`badge ${isShortage ? 'badge-danger badge-blinking-urgent' : 'badge-success'}`} style={{
                fontSize: '0.84rem',
                padding: '4px 10px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                {isShortage ? (
                  <>
                    <AlertTriangle size={15} /> 🚨 CẢNH BÁO: THIẾU {Math.abs(capacityDiff)} CHỖ NGƯỜI LỚN
                  </>
                ) : (
                  <>
                    <CheckCircle size={15} /> ✅ ĐỦ ĐỊNH MỨC PHÒNG (Dư {capacityDiff} chỗ dự phòng)
                  </>
                )}
              </span>
              <strong style={{ fontSize: '0.98rem', color: isShortage ? '#991b1b' : '#14532d' }}>
                {isShortage
                  ? `Đoàn có ${adultSlotsNeeded} suất cần phòng nhưng khách sạn chỉ đáp ứng được ${totalQuotaCapacity} chỗ!`
                  : `Định mức các loại phòng đã khai báo hoàn toàn đáp ứng đủ số người tham gia!`}
              </strong>
            </div>

            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Dựa trên <strong>{totalPeople} người</strong> ({adultSlotsNeeded} suất lớn + {totalChildren} bé 0 suất)
            </span>
          </div>

          {/* Lưới 3 cột: Nhu cầu tham gia | Khả năng đáp ứng định mức | Đánh giá cân đối */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {/* Cột 1: Nhu Cầu Tham Gia */}
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                1. Nhu Cầu Cần Xếp Chỗ (Đoàn)
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {adultSlotsNeeded}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                  suất người lớn
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                • Tổng đoàn: <strong>{totalPeople} người</strong><br />
                • Nhân viên: <strong>{employeesCount}</strong> | Người thân: <strong>{relativesCount}</strong> | PG: <strong>{pgsCount}</strong><br />
                • Trẻ em &lt;12t (ngủ cùng): <strong style={{ color: '#0284c7' }}>{totalChildren} bé (0 suất)</strong>
              </div>
            </div>

            {/* Cột 2: Sức Chứa Định Mức Khách Sạn */}
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                2. Sức Chứa Định Mức Khách Sạn
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: isShortage ? '#dc2626' : '#16a34a' }}>
                  {totalQuotaCapacity}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  chỗ tối đa ({totalQuotaRooms} phòng)
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                • P.2ng: <strong>{roomLimits[2] || 0}</strong> ({ (roomLimits[2] || 0) * 2 } chỗ)<br />
                • P.3ng: <strong>{roomLimits[3] || 0}</strong> ({ (roomLimits[3] || 0) * 3 } chỗ) • P.4ng: <strong>{roomLimits[4] || 0}</strong> ({ (roomLimits[4] || 0) * 4 } chỗ)<br />
                • P.5ng: <strong>{roomLimits[5] || 0}</strong> ({ (roomLimits[5] || 0) * 5 } chỗ) • P.6ng: <strong>{roomLimits[6] || 0}</strong> ({ (roomLimits[6] || 0) * 6 } chỗ)
              </div>
            </div>

            {/* Cột 3: Đánh Giá & Khuyến Nghị */}
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: isShortage ? '#fff1f2' : '#f0fdf4',
              border: isShortage ? '1px solid #fecdd3' : '1px solid #bbf7d0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isShortage ? '#be123c' : '#15803d', marginBottom: 4, textTransform: 'uppercase' }}>
                  3. Đánh Giá & Khuyến Nghị
                </div>
                <div style={{ fontSize: '0.82rem', lineHeight: 1.45, color: isShortage ? '#9f1239' : '#166534' }}>
                  {isShortage ? (
                    <>
                      ⚠️ <strong>Đang thiếu {Math.abs(capacityDiff)} chỗ người lớn</strong> ({totalQuotaCapacity} chỗ &lt; {adultSlotsNeeded} suất).
                      <br />
                      Khuyến nghị: Cần tăng thêm ít nhất <strong>{Math.ceil(Math.abs(capacityDiff) / 2)} phòng</strong> (loại 2 người) hoặc nâng định mức phòng 4-6 người.
                    </>
                  ) : (
                    <>
                      🎉 <strong>Hoàn toàn đủ chỗ</strong> ({totalQuotaCapacity} chỗ &ge; {adultSlotsNeeded} suất).
                      <br />
                      Sau khi xếp hết {adultSlotsNeeded} suất người lớn, đoàn vẫn còn <strong>dư {capacityDiff} chỗ dự phòng</strong> để bổ sung phát sinh.
                    </>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: isShortage ? '#be123c' : '#15803d', marginTop: 6, fontWeight: 700 }}>
                {isShortage ? '🔴 Cần tăng thêm định mức phòng' : '🟢 Định mức phòng an toàn'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hotel Rooming Breakdown Table (Con số đặt phòng gửi khách sạn) */}
      <div className="glass-card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 800, margin: 0 }}>
              Cơ Cấu Phòng Khách Sạn Cần Đặt (Booking Breakdown)
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '1px 0 0 0' }}>
              Con số thực tế theo từng loại phòng để gửi bộ phận Sales khách sạn
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('rooms')}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
          >
            Xem Chi Tiết Từng Phòng →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
          {[2, 3, 4, 5, 6].map(cap => {
            const limit = currentTrip.roomLimits?.[cap];
            const count = capacityCounts[cap];
            return (
              <div
                key={cap}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: count > 0 ? 'rgba(37, 99, 235, 0.04)' : 'var(--bg-muted)',
                  border: count > 0 ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid var(--border-subtle)',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Phòng {cap} Người
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, margin: '2px 0' }}>
                  <span style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: count > 0 ? 'var(--primary-500)' : 'var(--text-muted)',
                    lineHeight: 1.1
                  }}>
                    {limit !== undefined ? `${count}/${limit}` : count}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    phòng
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Children Info */}
        <div style={{
          marginTop: 10,
          padding: '7px 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Baby size={16} style={{ color: 'var(--color-success)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Tổng số trẻ em đi kèm đoàn: <strong>{totalChildren} trẻ</strong> (ngủ chung giường bố mẹ).
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Giới hạn tối đa: {currentTrip.maxChildrenPerRoom} trẻ/phòng
          </span>
        </div>
      </div>
    </div>
  );
};
