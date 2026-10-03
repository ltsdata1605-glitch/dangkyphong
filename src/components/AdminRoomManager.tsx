import React, { useState, useMemo } from 'react';
import { Person, Room, Trip } from '../types';
import { removeVietnameseTones } from '../utils/textUtils';
import { validateRoom } from '../services/roomingEngine';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Edit,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Building,
  Bed,
  ShieldCheck,
  Crown,
  Baby,
  LayoutList,
  LayoutGrid
} from 'lucide-react';

interface AdminRoomManagerProps {
  rooms: Room[];
  people: Person[];
  currentTrip?: Trip | null;
  onDeleteRoom: (roomId: string) => void;
  onDeleteAllRooms: () => void;
  onRemoveMember: (roomId: string, personId: string) => void;
  onAddMember: (roomId: string, personId: string) => Promise<boolean> | void;
  onSaveOverride: (roomId: string, note: string) => void;
}

export const AdminRoomManager: React.FC<AdminRoomManagerProps> = ({
  rooms,
  people,
  currentTrip,
  onDeleteRoom,
  onDeleteAllRooms,
  onRemoveMember,
  onAddMember,
  onSaveOverride
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FULL' | 'UNDER' | 'OVERRIDE'>('ALL');
  const [capacityFilter, setCapacityFilter] = useState<number | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');

  // Modal thêm người vào phòng
  const [addingToRoom, setAddingToRoom] = useState<Room | null>(null);
  const [personSearch, setPersonSearch] = useState('');

  // Modal Admin Override ghi chú
  const [overrideModalRoom, setOverrideModalRoom] = useState<Room | null>(null);
  const [overrideNote, setOverrideNote] = useState('');

  // Modal xác nhận xóa 1 phòng
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  // Modal xác nhận xóa TẤT CẢ phòng
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);

  const peopleMap = useMemo(() => new Map(people.map(p => [p.id, p])), [people]);

  // Lọc danh sách phòng
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Bỏ qua phòng rác không có thành viên
      if (!room.memberIds || room.memberIds.length === 0) return false;

      // Filter status
      if (statusFilter === 'FULL' && room.status !== 'FULL') return false;
      if (statusFilter === 'UNDER' && room.status !== 'UNDER') return false;
      if (statusFilter === 'OVERRIDE' && !room.adminOverride) return false;

      // Filter capacity
      if (capacityFilter !== 'ALL' && room.capacity !== capacityFilter) return false;

      // Filter search
      if (searchTerm.trim()) {
        const clean = removeVietnameseTones(searchTerm);
        const matchCode = room.code.toLowerCase().includes(clean);
        const members = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
        const matchMember = members.some(m => removeVietnameseTones(m.name).includes(clean) || m.code.includes(clean));
        return matchCode || matchMember;
      }

      return true;
    }).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
  }, [rooms, statusFilter, capacityFilter, searchTerm, peopleMap]);

  // Những người chưa có phòng để thêm
  const unassignedPeople = useMemo(() => {
    const pool = people.filter(p => !p.roomId);
    if (!personSearch.trim()) return pool.slice(0, 15);
    const clean = removeVietnameseTones(personSearch);
    return pool.filter(p =>
      removeVietnameseTones(p.name).includes(clean) ||
      p.code.toLowerCase().includes(clean) ||
      removeVietnameseTones(p.store).includes(clean)
    ).slice(0, 20);
  }, [people, personSearch]);

  const handleOpenOverride = (room: Room) => {
    setOverrideModalRoom(room);
    setOverrideNote(room.adminNote || '');
  };

  const handleConfirmOverride = () => {
    if (!overrideModalRoom) return;
    onSaveOverride(overrideModalRoom.id, overrideNote);
    setOverrideModalRoom(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Search and Filters Bar */}
      <div className="glass-card admin-filter-bar" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, flex: '1 1 300px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: 200, flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field admin-filter-input"
              placeholder="Tìm mã phòng, tên thành viên, MSNV..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 38, paddingRight: 12, height: 40 }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="input-field admin-filter-select"
            style={{ width: 'auto', height: 40, padding: '0 12px', cursor: 'pointer' }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="FULL">Đủ chỗ</option>
            <option value="UNDER">Thiếu người</option>
            <option value="OVERRIDE">Đã duyệt đặc cách</option>
          </select>

          {/* Capacity Filter */}
          <select
            value={capacityFilter}
            onChange={e => setCapacityFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="input-field admin-filter-select"
            style={{ width: 'auto', height: 40, padding: '0 12px', cursor: 'pointer' }}
          >
            <option value="ALL">Tất cả loại phòng</option>
            <option value={2}>Phòng 2 người</option>
            <option value={3}>Phòng 3 người</option>
            <option value={4}>Phòng 4 người</option>
            <option value={5}>Phòng 5 người</option>
            <option value={6}>Phòng 6 người</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-muted)',
            padding: 2,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              style={{
                padding: '4px 8px',
                fontSize: '0.75rem',
                background: viewMode === 'LIST' ? 'var(--bg-card-solid)' : 'transparent',
                color: viewMode === 'LIST' ? 'var(--primary-600)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                boxShadow: viewMode === 'LIST' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                fontWeight: viewMode === 'LIST' ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Xem dạng danh sách gọn"
            >
              <LayoutList size={14} />
              Danh sách gọn
            </button>
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              style={{
                padding: '4px 8px',
                fontSize: '0.75rem',
                background: viewMode === 'GRID' ? 'var(--bg-card-solid)' : 'transparent',
                color: viewMode === 'GRID' ? 'var(--primary-600)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                boxShadow: viewMode === 'GRID' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                fontWeight: viewMode === 'GRID' ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Xem dạng thẻ chi tiết"
            >
              <LayoutGrid size={14} />
              Dạng thẻ
            </button>
          </div>

          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Hiển thị: <strong>{filteredRooms.length}</strong> / {rooms.length} phòng
          </div>

          {rooms.length > 0 && (
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="btn btn-danger btn-sm"
              style={{ fontWeight: 700 }}
              title="Xóa giải tán toàn bộ danh sách phòng"
            >
              <Trash2 size={14} /> Xóa Tất Cả ({rooms.length} phòng)
            </button>
          )}
        </div>
      </div>

      {/* Rooms Content */}
      {filteredRooms.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Không tìm thấy phòng nào phù hợp với bộ lọc.
        </div>
      ) : viewMode === 'LIST' ? (
        /* Dạng Danh Sách Gọn Cho Admin (Tiết kiệm không gian) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredRooms.map(room => {
            const members = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);

            return (
              <div
                key={room.id}
                className="glass-card admin-room-list-item"
                style={{
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  borderLeft: room.status === 'FULL' ? '4px solid var(--color-success)' : '4px solid var(--color-warning)'
                }}
              >
                {/* Left: Thông tin phòng */}
                <div className="admin-room-info" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, minWidth: 42, color: 'var(--text-main)' }}>
                    {room.code}
                  </span>
                  <span className={`badge ${room.status === 'FULL' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                    {room.status === 'FULL' ? 'Đủ' : `Thiếu ${room.capacity - room.usedSlots}`}
                  </span>
                  <span className="badge badge-gray" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                    {room.capacity}ng
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {room.bedType}
                  </span>
                  {room.adminOverride && (
                    <span className="badge badge-primary" style={{ fontSize: '0.65rem' }} title={room.adminNote}>
                      <ShieldCheck size={10} /> Đặc cách
                    </span>
                  )}
                </div>

                {/* Middle: Thành viên trong phòng */}
                <div className="admin-room-members" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, flex: 1, minWidth: 260 }}>
                  {members.map(m => {
                    const isLeader = m.id === room.leaderId;
                    return (
                      <div
                        key={m.id}
                        className="admin-room-member-pill"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-muted)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.78rem'
                        }}
                      >
                        <span style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: m.gender === 'M' ? '#2563eb' : '#db2777',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.55rem',
                          fontWeight: 800
                        }}>
                          {m.gender === 'M' ? 'N' : 'F'}
                        </span>
                        <strong style={{ fontSize: '0.8rem' }}>{m.name}</strong>
                        {isLeader && <Crown size={11} style={{ color: '#f59e0b' }} />}
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {m.code}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveMember(room.id, m.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-danger)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            padding: '2px 4px',
                            lineHeight: 1,
                            borderRadius: '3px'
                          }}
                          title={`Xóa ${m.name} khỏi phòng`}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Thao tác Admin */}
                <div className="admin-room-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      if (room.memberIds.length >= 6) {
                        alert('Phòng này đã đạt tối đa 6 người/phòng, không thể thêm tiếp!');
                        return;
                      }
                      setAddingToRoom(room);
                      setPersonSearch('');
                    }}
                    disabled={room.memberIds.length >= 6}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '0.74rem',
                      padding: '3px 8px',
                      opacity: room.memberIds.length >= 6 ? 0.45 : 1,
                      cursor: room.memberIds.length >= 6 ? 'not-allowed' : 'pointer'
                    }}
                    title={room.memberIds.length >= 6 ? 'Phòng đã đủ tối đa 6 người' : 'Thêm thành viên vào phòng (Tự động đổi loại phòng nếu vượt sức chứa)'}
                  >
                    <UserPlus size={12} /> {room.memberIds.length >= 6 ? 'Đủ 6ng' : 'Thêm'}
                  </button>
                  <button
                    onClick={() => handleOpenOverride(room)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.74rem', padding: '3px 8px', color: room.adminOverride ? 'var(--primary-600)' : 'inherit' }}
                    title="Duyệt đặc cách phòng"
                  >
                    <ShieldCheck size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoomToDelete(room);
                    }}
                    className="btn btn-danger btn-sm"
                    style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                    title="Xóa giải tán phòng này"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Rooms Grid (Dạng Thẻ) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filteredRooms.map(room => {
            const members = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
            const leader = peopleMap.get(room.leaderId);

            return (
              <div
                key={room.id}
                className="glass-card"
                style={{
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: room.status === 'FULL' ? '4px solid var(--color-success)' : '4px solid var(--color-warning)'
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                          {room.code}
                        </h4>
                        <span className={`badge ${room.status === 'FULL' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                          {room.status === 'FULL' ? 'Đủ' : `Thiếu ${room.capacity - room.usedSlots}`}
                        </span>
                        {room.adminOverride && (
                          <span className="badge badge-primary" style={{ fontSize: '0.68rem' }} title={room.adminNote}>
                            <ShieldCheck size={11} /> Đặc cách
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Phòng {room.capacity} người • {room.bedType}
                      </div>
                    </div>

                    {/* Room Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleOpenOverride(room)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 8px' }}
                        title="Duyệt đặc cách / Ghi chú lý do ngoại lệ"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoomToDelete(room);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 8px', color: 'var(--color-danger)' }}
                        title="Xóa phòng này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Admin Note if present */}
                  {room.adminNote && (
                    <div style={{
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(37, 99, 235, 0.08)',
                      border: '1px solid rgba(37, 99, 235, 0.2)',
                      fontSize: '0.78rem',
                      color: 'var(--primary-600)',
                      marginBottom: 10
                    }}>
                      <strong>Ghi chú Admin:</strong> {room.adminNote}
                    </div>
                  )}

                  {/* Members List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '12px 0' }}>
                    {members.map(m => {
                      const isRoomLeader = m.id === room.leaderId;

                      return (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-muted)',
                            fontSize: '0.84rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                            <span className={`badge ${m.gender === 'M' ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                              {m.slot === 0 ? <Baby size={11} /> : (m.gender === 'M' ? 'Nam' : 'Nữ')}
                            </span>
                            <span style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {m.name}
                            </span>
                            {isRoomLeader && (
                              <Crown size={12} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {m.type === 'EMPLOYEE' ? m.code : (m.relation || 'Người thân')}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveMember(room.id, m.id);
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--color-danger)',
                                cursor: 'pointer',
                                padding: '2px 5px',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                lineHeight: 1
                              }}
                              title={`Xóa ${m.name} khỏi phòng`}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Add Member Button */}
                <div style={{ paddingTop: 10, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {room.usedSlots}/{room.capacity} suất {room.childCount > 0 && `(+${room.childCount} trẻ)`}
                  </span>
                  <button
                    onClick={() => {
                      if (room.memberIds.length >= 6) {
                        alert('Phòng này đã đạt tối đa 6 người/phòng, không thể thêm tiếp!');
                        return;
                      }
                      setAddingToRoom(room);
                      setPersonSearch('');
                    }}
                    disabled={room.memberIds.length >= 6}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '0.78rem',
                      padding: '4px 8px',
                      opacity: room.memberIds.length >= 6 ? 0.45 : 1,
                      cursor: room.memberIds.length >= 6 ? 'not-allowed' : 'pointer'
                    }}
                    title={room.memberIds.length >= 6 ? 'Phòng đã đủ tối đa 6 người' : 'Thêm thành viên vào phòng (Tự động đổi loại phòng nếu vượt sức chứa)'}
                  >
                    <UserPlus size={13} /> {room.memberIds.length >= 6 ? 'Đủ 6 người' : 'Thêm người'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm người vào phòng */}
      {addingToRoom && (() => {
        const addingRoomMembers = addingToRoom.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
        const currentAdultSlots = addingRoomMembers.filter(m => (m.slot ?? 1) > 0).length;
        const currentChildren = addingRoomMembers.filter(m => m.slot === 0).length;
        const isCurrentlyFull = currentAdultSlots >= addingToRoom.capacity;
        const potentialNextCap = Math.min(6, addingToRoom.capacity + 1);

        let isNextCapFull = false;
        let nextCapCount = 0;
        let nextCapLimit: number | undefined = undefined;
        if (currentTrip?.roomLimits) {
          nextCapLimit = currentTrip.roomLimits[potentialNextCap];
          nextCapCount = rooms.filter(r => r.id !== addingToRoom.id && r.capacity === potentialNextCap && r.memberIds && r.memberIds.length > 0).length;
          if (nextCapLimit !== undefined && nextCapCount >= nextCapLimit) {
            isNextCapFull = true;
          }
        }

        return (
          <div className="modal-overlay" onClick={() => setAddingToRoom(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Thêm Thành Viên Vào {addingToRoom.code}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Hiện có: <strong>{addingToRoom.memberIds.length} người</strong> ({currentAdultSlots} người lớn{currentChildren > 0 ? `, ${currentChildren} trẻ em` : ''}) • Loại: <strong>Phòng {addingToRoom.capacity} người</strong>
                  </p>
                </div>
                <button onClick={() => setAddingToRoom(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>✕</button>
              </div>

              {isCurrentlyFull && (
                <div style={{
                  padding: '10px 16px',
                  background: isNextCapFull ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  borderBottom: `1px solid ${isNextCapFull ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                  color: isNextCapFull ? 'var(--color-danger)' : '#b45309'
                }}>
                  {isNextCapFull ? (
                    <>
                      ⛔ <strong>Cảnh báo định mức:</strong> Phòng đã đủ {addingToRoom.capacity} người. Loại <strong>phòng {potentialNextCap} người</strong> đã đạt tối đa ({nextCapCount}/{nextCapLimit} phòng). <u>Không thể thêm người lớn để nâng sức chứa phòng này!</u>
                    </>
                  ) : (
                    <>
                      ⚠️ <strong>Lưu ý:</strong> Phòng đã đủ {addingToRoom.capacity} người. Nếu thêm 1 người lớn, hệ thống sẽ tự động nâng lên <strong>Phòng {potentialNextCap} người</strong> ({nextCapCount}/{nextCapLimit ?? '∞'} phòng đã dùng).
                    </>
                  )}
                </div>
              )}

              <div style={{ padding: '16px 20px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Tìm người chưa có phòng theo tên, MSNV, siêu thị..."
                  value={personSearch}
                  onChange={e => setPersonSearch(e.target.value)}
                  style={{ marginBottom: 12 }}
                  autoFocus
                />

                <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {unassignedPeople.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Không có nhân sự chưa xếp phòng nào phù hợp.
                    </div>
                  ) : (
                    unassignedPeople.map(p => {
                      const personSlot = (p.slot ?? 1);
                      const projectedAdultSlots = currentAdultSlots + (personSlot > 0 ? 1 : 0);
                      const willUpgrade = projectedAdultSlots > addingToRoom.capacity;
                      const nextCap = Math.min(6, projectedAdultSlots);

                      let isBlocked = false;
                      let blockedReason = '';
                      if (willUpgrade && currentTrip?.roomLimits) {
                        const lim = currentTrip.roomLimits[nextCap];
                        const count = rooms.filter(r => r.id !== addingToRoom.id && r.capacity === nextCap && r.memberIds && r.memberIds.length > 0).length;
                        if (lim !== undefined && count >= lim) {
                          isBlocked = true;
                          blockedReason = `Đã đủ định mức phòng ${nextCap} (${count}/${lim} phòng)`;
                        }
                      }

                      return (
                        <div
                          key={p.id}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: isBlocked ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-muted)',
                            border: isBlocked ? '1px dashed rgba(239, 68, 68, 0.3)' : '1px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>{p.name}</span>
                              <span className={`badge ${p.gender === 'M' ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                                {p.gender === 'M' ? 'Nam' : 'Nữ'}
                              </span>
                              {p.slot === 0 && (
                                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                                  Trẻ em (0s)
                                </span>
                              )}
                              {willUpgrade && (
                                <span className={`badge ${isBlocked ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                                  {isBlocked ? `⛔ Nâng P.${nextCap} (Hết định mức)` : `Nâng lên P.${nextCap}`}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {p.store} • {p.code}
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              if (addingToRoom.memberIds.length >= 6) {
                                alert('Phòng đã đạt tối đa 6 người, không thể thêm tiếp.');
                                return;
                              }
                              if (isBlocked) {
                                alert(`⚠️ KHÔNG THỂ THÊM VÀO PHÒNG!\n\nViệc thêm "${p.name}" sẽ nâng phòng từ ${addingToRoom.capacity} người lên ${nextCap} người.\nTuy nhiên loại phòng ${nextCap} người đã đạt tối đa định mức (${blockedReason}).\n\nHệ thống từ chối và không cho nâng sức chứa phòng!`);
                                return;
                              }
                              const res = await onAddMember(addingToRoom.id, p.id);
                              if (res !== false) {
                                setAddingToRoom(null);
                              }
                            }}
                            disabled={addingToRoom.memberIds.length >= 6 || isBlocked}
                            className={`btn ${isBlocked ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                            style={{
                              fontSize: '0.78rem',
                              padding: '5px 10px',
                              whiteSpace: 'nowrap',
                              opacity: isBlocked ? 0.6 : 1,
                              cursor: isBlocked ? 'not-allowed' : 'pointer'
                            }}
                            title={isBlocked ? blockedReason : 'Chọn vào phòng'}
                          >
                            {isBlocked ? 'Hết định mức' : 'Chọn vào phòng'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Duyệt Đặc Cách (Admin Override) */}
      {overrideModalRoom && (
        <div className="modal-overlay" onClick={() => setOverrideModalRoom(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Duyệt Đặc Cách / Ghi Chú Phòng {overrideModalRoom.code}
              </h3>
              <button onClick={() => setOverrideModalRoom(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                Admin có quyền bỏ qua quy tắc ghép phòng (ví dụ: nam nữ là đồng nghiệp đặc biệt hoặc gia đình nhiều thành viên), nhưng <strong>bắt buộc nhập lý do</strong> để lưu vào Rooming List:
              </p>

              <textarea
                className="input-field"
                rows={3}
                placeholder="Nhập lý do duyệt đặc cách (ví dụ: Vợ chồng cùng làm tại 2 siêu thị khác nhau; Ban lãnh đạo duyệt ghép chung...)"
                value={overrideNote}
                onChange={e => setOverrideNote(e.target.value)}
                style={{ resize: 'none', marginBottom: 16 }}
                autoFocus
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setOverrideModalRoom(null)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleConfirmOverride}>
                  Lưu Duyệt Đặc Cách
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa 1 Phòng */}
      {roomToDelete && (
        <div className="modal-overlay" onClick={() => setRoomToDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-danger)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Trash2 size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>
              Xác Nhận Xóa Phòng {roomToDelete.code}?
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Phòng <strong>{roomToDelete.code}</strong> sẽ bị giải tán. Tất cả thành viên trong phòng này sẽ trở về trạng thái <strong>Chưa có phòng</strong>.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setRoomToDelete(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1.3 }}
                onClick={() => {
                  onDeleteRoom(roomToDelete.id);
                  setRoomToDelete(null);
                }}
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa TẤT CẢ Phòng */}
      {isDeleteAllModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteAllModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-danger)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8, color: 'var(--color-danger)' }}>
              Xóa Toàn Bộ {rooms.length} Phòng?
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              <strong>Lưu ý:</strong> Toàn bộ <strong>{rooms.length} phòng</strong> đã tạo sẽ bị xóa hoàn toàn. Tất cả 550 nhân sự trong chuyến đi sẽ được giải phóng về trạng thái <strong>Chưa có phòng</strong> để xếp lại từ đầu.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setIsDeleteAllModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1.5, fontWeight: 700 }}
                onClick={() => {
                  onDeleteAllRooms();
                  setIsDeleteAllModalOpen(false);
                }}
              >
                Xác Nhận Xóa Hết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
