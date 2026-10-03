import React, { useState, useMemo } from 'react';
import { Person, Room, Trip } from '../types';
import { removeVietnameseTones } from '../utils/textUtils';
import {
  X,
  Search,
  Bed,
  Users,
  Building,
  CheckCircle2,
  AlertCircle,
  Crown,
  Filter,
  UserCheck,
  LayoutList,
  LayoutGrid
} from 'lucide-react';

interface AllRoomsDirectoryModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  trip: Trip;
  rooms: Room[];
  people: Person[];
  currentEmployee?: Person | null;
  isInline?: boolean;
}

export const AllRoomsDirectoryModal: React.FC<AllRoomsDirectoryModalProps> = ({
  isOpen = true,
  onClose,
  trip,
  rooms,
  people,
  currentEmployee,
  isInline = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FULL' | 'UNDER'>('ALL');
  const [capacityFilter, setCapacityFilter] = useState<number | 'ALL'>('ALL');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F' | 'FAMILY'>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');

  const peopleMap = useMemo(() => {
    return new Map<string, Person>(people.map(p => [p.id, p]));
  }, [people]);

  // Danh sách các siêu thị có người trong phòng
  const availableStores = useMemo(() => {
    const storeSet = new Set<string>();
    rooms.forEach(r => {
      r.memberIds.forEach(id => {
        const p = peopleMap.get(id);
        if (p && p.store) storeSet.add(p.store);
      });
    });
    return Array.from(storeSet).sort();
  }, [rooms, peopleMap]);

  // Đếm tổng số người đã có phòng
  const totalAssignedPeople = useMemo(() => {
    return rooms.reduce((acc, r) => acc + r.memberIds.length, 0);
  }, [rooms]);

  // Lọc phòng theo điều kiện
  const filteredRooms = useMemo(() => {
    const cleanSearch = removeVietnameseTones(searchTerm.trim());

    return rooms.filter(room => {
      const members = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);

      // 1. Lọc theo Trạng thái (Đủ / Thiếu)
      if (statusFilter === 'FULL' && room.status !== 'FULL') return false;
      if (statusFilter === 'UNDER' && room.status !== 'UNDER') return false;

      // 2. Lọc theo Loại phòng (2, 3, 4, 5, 6 người)
      if (capacityFilter !== 'ALL' && room.capacity !== capacityFilter) return false;

      // 3. Lọc theo Siêu thị
      if (storeFilter !== 'ALL') {
        const hasStore = members.some(m => m.store === storeFilter);
        if (!hasStore) return false;
      }

      // 4. Lọc theo Giới tính phòng
      if (genderFilter !== 'ALL') {
        const hasMale = members.some(m => m.gender === 'M');
        const hasFemale = members.some(m => m.gender === 'F');

        if (genderFilter === 'M' && (hasFemale || !hasMale)) return false;
        if (genderFilter === 'F' && (hasMale || !hasFemale)) return false;
        if (genderFilter === 'FAMILY' && (!hasMale || !hasFemale)) return false;
      }

      // 5. Lọc theo từ khóa tìm kiếm (Số phòng, MSNV, Họ tên, Siêu thị...)
      if (cleanSearch) {
        const matchRoomCode = removeVietnameseTones(room.code).includes(cleanSearch);
        const matchMember = members.some(m => {
          const matchName = removeVietnameseTones(m.name).includes(cleanSearch);
          const matchCode = m.code.toLowerCase().includes(cleanSearch);
          const matchStore = removeVietnameseTones(m.store).includes(cleanSearch);
          return matchName || matchCode || matchStore;
        });

        if (!matchRoomCode && !matchMember) return false;
      }

      return true;
    }).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
  }, [rooms, peopleMap, searchTerm, statusFilter, capacityFilter, storeFilter, genderFilter]);

  if (!isInline && !isOpen) return null;

  const modalBody = (
    <div
      className={isInline ? "glass-card" : "modal-content"}
      onClick={e => e.stopPropagation()}
      style={isInline ? {
        width: '100%',
        margin: '16px 0',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden'
      } : {
        maxWidth: 960,
        width: '95%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 22px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-card-solid)',
        position: isInline ? 'relative' : 'sticky',
        top: 0,
        zIndex: 10
      }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-500)'
            }}>
              <Bed size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                XEM PHÒNG ĐÃ ĐĂNG KÝ
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {trip.name} · <strong>{rooms.length}</strong> phòng đã tạo ({totalAssignedPeople} người đã có phòng)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', borderRadius: '50%' }}
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          padding: '14px 24px',
          background: 'var(--bg-muted)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="🔍 Tra cứu nhanh theo số phòng (P.1), MSNV (21707), họ tên, siêu thị..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 42, fontSize: '0.92rem', background: 'var(--bg-card-solid)' }}
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 10,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            {/* Left Filter Chips */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              {/* Status Filter */}
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              >
                Tất cả ({rooms.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('FULL')}
                className={`btn btn-sm ${statusFilter === 'FULL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              >
                ✓ Đủ người ({rooms.filter(r => r.status === 'FULL').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('UNDER')}
                className={`btn btn-sm ${statusFilter === 'UNDER' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              >
                ⏳ Còn chỗ ({rooms.filter(r => r.status === 'UNDER').length})
              </button>

              {/* Gender Filter */}
              <span style={{ color: 'var(--border-subtle)', margin: '0 2px' }}>|</span>
              <button
                type="button"
                onClick={() => setGenderFilter(genderFilter === 'M' ? 'ALL' : 'M')}
                className={`btn btn-sm ${genderFilter === 'M' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              >
                Nam
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter(genderFilter === 'F' ? 'ALL' : 'F')}
                className={`btn btn-sm ${genderFilter === 'F' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              >
                Nữ
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter(genderFilter === 'FAMILY' ? 'ALL' : 'FAMILY')}
                className={`btn btn-sm ${genderFilter === 'FAMILY' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              >
                Gia đình / Vợ chồng
              </button>
            </div>

            {/* Right Dropdown Filters & View Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

              {/* Capacity Filter */}
              <select
                value={capacityFilter}
                onChange={e => setCapacityFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card-solid)',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                <option value="ALL">Tất cả loại phòng</option>
                <option value={2}>Phòng 2 người</option>
                <option value={3}>Phòng 3 người</option>
                <option value={4}>Phòng 4 người</option>
                <option value={5}>Phòng 5 người</option>
                <option value={6}>Phòng 6 người</option>
              </select>

              {/* Store Filter */}
              <select
                value={storeFilter}
                onChange={e => setStoreFilter(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card-solid)',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  maxWidth: 200,
                  outline: 'none'
                }}
              >
                <option value="ALL">🏢 Tất cả siêu thị</option>
                {availableStores.map(store => (
                  <option key={store} value={store}>
                    {store}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Rooms List Body */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          {filteredRooms.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 20px',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}>
              <Bed size={48} style={{ opacity: 0.3 }} />
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                Không tìm thấy phòng nào phù hợp với bộ lọc
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', maxWidth: 400 }}>
                Thử xóa từ khóa tìm kiếm hoặc đổi lại bộ lọc trạng thái, loại phòng hoặc siêu thị.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setCapacityFilter('ALL');
                  setStoreFilter('ALL');
                  setGenderFilter('ALL');
                }}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 8 }}
              >
                Đặt lại tất cả bộ lọc
              </button>
            </div>
          ) : viewMode === 'LIST' ? (
            /* Dạng Danh Sách Gọn & Tiết Kiệm Không Gian */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredRooms.map(room => {
                const members = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
                const isMyRoom = currentEmployee && room.memberIds.includes(currentEmployee.id);
                const hasMale = members.some(m => m.gender === 'M');
                const hasFemale = members.some(m => m.gender === 'F');
                const isFamilyMixed = hasMale && hasFemale;

                return (
                  <div
                    key={room.id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: isMyRoom ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-card-solid)',
                      border: isMyRoom ? '1.5px solid var(--primary-500)' : '1px solid var(--border-subtle)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Left: Thông tin phòng gọn gàng */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        minWidth: 40
                      }}>
                        {room.code}
                      </span>

                      {isMyRoom && (
                        <span className="badge badge-primary" style={{ fontSize: '0.66rem', padding: '1px 6px', fontWeight: 700 }}>
                          Phòng bạn
                        </span>
                      )}

                      <span className="badge badge-gray" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                        {room.capacity} người
                      </span>

                      {room.status === 'FULL' ? (
                        <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                          ✓ Đủ {room.usedSlots}/{room.capacity}
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                          ⏳ Còn {room.capacity - room.usedSlots}
                        </span>
                      )}

                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Bed size={12} style={{ color: 'var(--primary-500)' }} />
                        {room.bedType}
                      </span>

                      {isFamilyMixed ? (
                        <span style={{ fontSize: '0.72rem', color: '#ea580c', fontWeight: 700 }}>Gia đình</span>
                      ) : hasFemale ? (
                        <span style={{ fontSize: '0.72rem', color: '#db2777', fontWeight: 600 }}>Nữ</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>Nam</span>
                      )}
                    </div>

                    {/* Right: Thành viên trong phòng nằm ngang dạng chips */}
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, flex: 1, minWidth: 240, justifyContent: 'flex-start' }}>
                      {members.map(member => {
                        const isLeader = member.id === room.leaderId;
                        const isCurrent = currentEmployee && member.id === currentEmployee.id;

                        let roleLabel = member.type === 'EMPLOYEE' ? '' : (member.relation || 'Người thân');
                        if (member.relation === 'SPOUSE') roleLabel = 'Vợ/Chồng';
                        else if (member.relation === 'PARENT') roleLabel = 'Ba/Mẹ';
                        else if (member.relation === 'CHILD_U5') roleLabel = 'Con <5t';
                        else if (member.relation === 'CHILD_5_11') roleLabel = 'Con 5-11t';
                        else if (member.relation === 'CHILD_12P') roleLabel = 'Con ≥12t';
                        else if (member.type === 'PG') roleLabel = 'PG';

                        return (
                          <div
                            key={member.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: isCurrent ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-muted)',
                              border: isCurrent ? '1px solid var(--primary-500)' : '1px solid var(--border-subtle)',
                              fontSize: '0.78rem',
                              whiteSpace: 'nowrap'
                            }}
                            title={`${member.name} (${member.code}) - ${member.store}`}
                          >
                            <span style={{
                              width: 15,
                              height: 15,
                              borderRadius: '50%',
                              background: member.gender === 'M' ? '#2563eb' : '#db2777',
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.58rem',
                              fontWeight: 800,
                              flexShrink: 0
                            }}>
                              {member.gender === 'M' ? 'N' : 'F'}
                            </span>

                            <strong style={{ color: isCurrent ? 'var(--primary-600)' : 'var(--text-main)', fontSize: '0.8rem' }}>
                              {member.name}
                            </strong>

                            {isLeader && (
                              <span title="Trưởng phòng" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <Crown size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />
                              </span>
                            )}

                            {roleLabel ? (
                              <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0 4px', lineHeight: 1.3 }}>
                                {roleLabel}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {member.code}
                              </span>
                            )}

                            {member.store && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', maxWidth: 85, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                • {member.store.split('-')[0].trim()}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {room.capacity > room.usedSlots && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontStyle: 'italic', paddingLeft: 4 }}>
                          +{room.capacity - room.usedSlots} chỗ trống
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: 16
            }}>
              {filteredRooms.map(room => {
                const members = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
                const isMyRoom = currentEmployee && room.memberIds.includes(currentEmployee.id);
                const hasMale = members.some(m => m.gender === 'M');
                const hasFemale = members.some(m => m.gender === 'F');
                const isFamilyMixed = hasMale && hasFemale;

                return (
                  <div
                    key={room.id}
                    className="glass-card"
                    style={{
                      padding: '16px 18px',
                      borderRadius: 'var(--radius-lg)',
                      border: isMyRoom
                        ? '2px solid var(--primary-500)'
                        : '1px solid var(--border-subtle)',
                      background: isMyRoom ? 'rgba(37, 99, 235, 0.03)' : 'var(--bg-card-solid)',
                      boxShadow: isMyRoom ? '0 4px 20px rgba(37, 99, 235, 0.15)' : 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    {/* Room Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border-subtle)',
                      paddingBottom: 10
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          color: 'var(--text-main)'
                        }}>
                          {room.code}
                        </span>

                        {isMyRoom && (
                          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                            <UserCheck size={12} /> Phòng của bạn
                          </span>
                        )}

                        <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
                          Phòng {room.capacity} người
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {room.status === 'FULL' ? (
                          <span className="badge badge-success" style={{ fontSize: '0.74rem' }}>
                            ✓ Đủ {room.usedSlots}/{room.capacity}
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: '0.74rem' }}>
                            ⏳ Còn {room.capacity - room.usedSlots} chỗ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Room Metadata: Bed Type & Gender Tag */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)'
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Bed size={13} style={{ color: 'var(--primary-500)' }} />
                        <strong>
                          {room.bedType === 'DOUBLE' && 'Double (1 Giường đôi)'}
                          {room.bedType === 'TWIN' && 'Twin (2 Giường đơn)'}
                          {room.bedType === 'TRIPLE' && 'Triple (3 Giường)'}
                          {room.bedType === 'FAMILY' && 'Family (Gia đình)'}
                        </strong>
                      </span>

                      <span>
                        {isFamilyMixed ? (
                          <span style={{ color: '#ea580c', fontWeight: 600 }}>Gia đình / Vợ chồng</span>
                        ) : hasFemale ? (
                          <span style={{ color: '#db2777', fontWeight: 600 }}>Phòng Nữ</span>
                        ) : (
                          <span style={{ color: '#2563eb', fontWeight: 600 }}>Phòng Nam</span>
                        )}
                      </span>
                    </div>

                    {/* Members List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
                      {members.map(member => {
                        const isLeader = member.id === room.leaderId;
                        const isCurrent = currentEmployee && member.id === currentEmployee.id;

                        let roleLabel = member.type === 'EMPLOYEE' ? 'Nhân viên' : (member.relation || 'Người thân');
                        if (member.relation === 'SPOUSE') roleLabel = 'Vợ / Chồng';
                        else if (member.relation === 'PARENT') roleLabel = 'Ba / Mẹ';
                        else if (member.relation === 'CHILD_U5') roleLabel = 'Con (<5 tuổi)';
                        else if (member.relation === 'CHILD_5_11') roleLabel = 'Con (5-11 tuổi)';
                        else if (member.relation === 'CHILD_12P') roleLabel = 'Con (>=12 tuổi)';
                        else if (member.type === 'PG') roleLabel = 'PG';

                        return (
                          <div
                            key={member.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: isCurrent ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-muted)',
                              border: isCurrent ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid transparent',
                              gap: 8
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              {/* Avatar circle */}
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: member.gender === 'M' ? '#2563eb' : '#db2777',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                flexShrink: 0
                              }}>
                                {member.gender === 'M' ? 'Nam' : 'Nữ'}
                              </div>

                              <div style={{ minWidth: 0 }}>
                                <div style={{
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  color: 'var(--text-main)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {member.name}
                                  </span>
                                  {isLeader && (
                                    <span
                                      className="badge badge-warning"
                                      style={{ fontSize: '0.62rem', padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                                    >
                                      <Crown size={10} /> Trưởng phòng
                                    </span>
                                  )}
                                </div>
                                <div style={{
                                  fontSize: '0.73rem',
                                  color: 'var(--text-muted)',
                                  marginTop: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  <Building size={11} style={{ flexShrink: 0 }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {member.store}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                              <span className="badge badge-gray" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                {member.code}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                {roleLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card-solid)',
          fontSize: '0.82rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            Hiển thị <strong>{filteredRooms.length}</strong> / {rooms.length} phòng
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 600, padding: '6px 16px' }}
            >
              {isInline ? '← Quay lại phòng của bạn' : 'Đóng'}
            </button>
          )}
        </div>
      </div>
  );

  if (isInline) {
    return modalBody;
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      {modalBody}
    </div>
  );
};
