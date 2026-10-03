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
  onNavigateTab: (tab: 'rooms' | 'people' | 'trips' | 'logs') => void;
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

  // 3. Trẻ em
  const totalChildren = people.filter(p => p.slot === 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Top Banner Actions */}
      <div className="glass-card" style={{
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <h2 style={{ fontSize: '1.22rem', fontWeight: 800, margin: 0 }}>
            Bảng Điều Khiển Ban Tổ Chức (Admin)
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Quản lý sắp xếp phòng, kiểm soát quy tắc và xuất file Rooming List gửi khách sạn
          </p>
        </div>

        {/* Action Buttons: thu nhỏ gọn và cùng dòng với tiêu đề */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
          onClick={() => onNavigateTab('people')}
          style={{ padding: '10px 14px', cursor: 'pointer' }}
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
          onClick={() => onNavigateTab('people')}
          style={{ padding: '10px 14px', cursor: 'pointer' }}
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
          onClick={() => onNavigateTab('people')}
          style={{ padding: '10px 14px', cursor: 'pointer' }}
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
