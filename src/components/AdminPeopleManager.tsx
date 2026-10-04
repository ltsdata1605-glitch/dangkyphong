import React, { useState, useMemo } from 'react';
import { Person, Gender, Room, Trip } from '../types';
import { removeVietnameseTones, getRelationText } from '../utils/textUtils';
import {
  Search,
  Filter,
  UserCheck,
  UserX,
  Link2,
  Building,
  CheckCircle,
  Baby,
  Users,
  Bed,
  RotateCcw,
  Plus,
  AlertTriangle
} from 'lucide-react';

import { RoomModal } from './RoomModal';

interface AdminPeopleManagerProps {
  people: Person[];
  rooms: Room[];
  currentTrip?: Trip;
  roomFilter?: 'ALL' | 'ASSIGNED' | 'UNASSIGNED';
  onRoomFilterChange?: (filter: 'ALL' | 'ASSIGNED' | 'UNASSIGNED') => void;
  onToggleGender: (personId: string) => void;
  onAssignRelative: (relativeId: string, employeeCode: string) => void;
  onAddMemberToRoom?: (roomId: string, personId: string) => void;
  onRemoveMemberFromRoom?: (roomId: string, personId: string) => void;
  onCreateRoomForPerson?: (capacity: number, memberIds: string[]) => void;
  onSaveRoomForPerson?: (capacity: number, memberIds: string[], editingRoomId?: string) => void;
}

export const AdminPeopleManager: React.FC<AdminPeopleManagerProps> = ({
  people,
  rooms,
  currentTrip,
  roomFilter: propRoomFilter,
  onRoomFilterChange,
  onToggleGender,
  onAssignRelative,
  onAddMemberToRoom,
  onRemoveMemberFromRoom,
  onCreateRoomForPerson,
  onSaveRoomForPerson
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EMPLOYEE' | 'RELATIVE' | 'PG'>('ALL');
  const [internalRoomFilter, setInternalRoomFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');

  const roomFilter = propRoomFilter !== undefined ? propRoomFilter : internalRoomFilter;
  const setRoomFilter = (val: 'ALL' | 'ASSIGNED' | 'UNASSIGNED') => {
    setInternalRoomFilter(val);
    if (onRoomFilterChange) onRoomFilterChange(val);
  };

  const [selectedStore, setSelectedStore] = useState<string>('ALL');

  // Modal gán người thân cho nhân viên
  const [linkingRelative, setLinkingRelative] = useState<Person | null>(null);
  const [targetEmployeeCode, setTargetEmployeeCode] = useState<string>('');

  // Modal sắp / xếp phòng cho nhân sự
  const [arrangingPerson, setArrangingPerson] = useState<Person | null>(null);

  // Modal xác nhận xóa người ra khỏi phòng
  const [personToRemoveFromRoom, setPersonToRemoveFromRoom] = useState<{ person: Person; room: Room } | null>(null);

  const roomsMap = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);
  const peopleMap = useMemo(() => new Map(people.map(p => [p.id, p])), [people]);

  // Danh sách các siêu thị duy nhất
  const uniqueStores = useMemo(() => {
    const stores = Array.from(new Set(people.map(p => p.store).filter(Boolean)));
    stores.sort();
    return stores;
  }, [people]);

  // Lọc danh sách nhân sự
  const filteredPeople = useMemo(() => {
    return people.filter(p => {
      if (typeFilter !== 'ALL' && p.type !== typeFilter) return false;
      if (roomFilter === 'ASSIGNED' && !p.roomId) return false;
      if (roomFilter === 'UNASSIGNED' && p.roomId) return false;
      if (selectedStore !== 'ALL' && p.store !== selectedStore) return false;

      if (searchTerm.trim()) {
        const clean = removeVietnameseTones(searchTerm);
        const matchName = removeVietnameseTones(p.name).includes(clean);
        const matchCode = p.code.toLowerCase().includes(clean);
        const matchStore = removeVietnameseTones(p.store).includes(clean);
        return matchName || matchCode || matchStore;
      }

      return true;
    });
  }, [people, typeFilter, roomFilter, selectedStore, searchTerm]);

  // Danh sách nhân viên trong cùng siêu thị của người thân đang chọn
  const candidateEmployeesForLinking = useMemo(() => {
    if (!linkingRelative) return [];
    return people.filter(p => p.type === 'EMPLOYEE' && p.store === linkingRelative.store);
  }, [people, linkingRelative]);

  const handleConfirmLink = () => {
    if (!linkingRelative || !targetEmployeeCode) return;
    onAssignRelative(linkingRelative.id, targetEmployeeCode);
    setLinkingRelative(null);
    setTargetEmployeeCode('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls Bar */}
      <div className="glass-card admin-filter-bar" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, flex: '1 1 300px' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: 200, flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field admin-filter-input"
              placeholder="Tìm theo tên, MSNV, siêu thị..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 38, height: 40 }}
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="input-field admin-filter-select"
            style={{ width: 'auto', height: 40, padding: '0 12px', cursor: 'pointer' }}
          >
            <option value="ALL">Tất cả đối tượng</option>
            <option value="EMPLOYEE">Nhân viên (434)</option>
            <option value="RELATIVE">Người thân (116)</option>
            <option value="PG">PG (10)</option>
          </select>

          {/* Room Filter */}
          <select
            value={roomFilter}
            onChange={e => setRoomFilter(e.target.value as any)}
            className="input-field admin-filter-select"
            style={{ width: 'auto', height: 40, padding: '0 12px', cursor: 'pointer' }}
          >
            <option value="ALL">Tất cả phòng</option>
            <option value="ASSIGNED">Đã có phòng</option>
            <option value="UNASSIGNED">Chưa có phòng</option>
          </select>

          {/* Store Filter */}
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            className="input-field admin-filter-select"
            style={{ width: 'auto', height: 40, padding: '0 12px', cursor: 'pointer', maxWidth: 200 }}
          >
            <option value="ALL">Tất cả siêu thị ({uniqueStores.length})</option>
            {uniqueStores.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          Hiển thị: <strong>{filteredPeople.length}</strong> / {people.length} người
        </div>
      </div>

      {/* People Table */}
      <div className="glass-card admin-table-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-compact-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Họ Và Tên</th>
                <th style={{ padding: '12px 16px' }}>Giới Tính</th>
                <th style={{ padding: '12px 16px' }}>Phân Loại</th>
                <th style={{ padding: '12px 16px' }}>Quan Hệ / MSNV Bảo Trợ</th>
                <th style={{ padding: '12px 16px' }}>Siêu Thị</th>
                <th style={{ padding: '12px 16px' }}>Phòng</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredPeople.map(p => {
                const room = p.roomId ? roomsMap.get(p.roomId) : null;

                return (
                  <tr
                    key={p.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Mã: {p.code}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => onToggleGender(p.id)}
                        className={`badge ${p.gender === 'M' ? 'badge-primary' : 'badge-warning'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        title="Bấm để đổi nhanh giới tính Nam <-> Nữ"
                      >
                        {p.gender === 'M' ? 'Nam' : 'Nữ'} ⇄
                      </button>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {p.type === 'EMPLOYEE' && <span className="badge badge-primary">Nhân viên</span>}
                      {p.type === 'RELATIVE' && <span className="badge badge-warning">Người thân</span>}
                      {p.type === 'PG' && <span className="badge badge-gray">PG Độc lập</span>}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {p.type === 'RELATIVE' ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {getRelationText(p.relation, p.type, p.slot)}
                            {p.slot === 0 && (
                              <span style={{ fontSize: '0.74rem', color: 'var(--color-success)', marginLeft: 5, fontWeight: 700 }}>
                                (0 suất)
                              </span>
                            )}
                          </div>
                          {p.ownerId ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 600, marginTop: 2 }}>
                              NV bảo trợ: {p.ownerId}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600, marginTop: 2 }}>
                              Chưa gắn nhân viên
                            </div>
                          )}
                        </div>
                      ) : p.type === 'PG' ? (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>PG Độc lập</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.store}>
                        {p.store}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {room ? (
                        <span className="badge badge-success">
                          {room.code}
                        </span>
                      ) : (
                        <span className="badge badge-gray">
                          Chưa có
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        {/* Nút Xếp / Đổi phòng cho nhân sự */}
                        {room ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setArrangingPerson(p)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title={`Đang ở phòng ${room.code} - Bấm để chuyển phòng khác`}
                            >
                              <RotateCcw size={12} /> Đổi phòng
                            </button>
                            <button
                              type="button"
                              onClick={() => setPersonToRemoveFromRoom({ person: p, room })}
                              className="btn btn-danger btn-sm"
                              style={{ padding: '3px 7px', fontSize: '0.74rem' }}
                              title={`Xóa ${p.name} khỏi phòng ${room.code}`}
                            >
                              <UserX size={12} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setArrangingPerson(p)}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                            title="Sắp phòng cho nhân viên này"
                          >
                            <Bed size={13} /> Xếp phòng
                          </button>
                        )}

                        {/* Nút Gán NV cho Người thân */}
                        {p.type === 'RELATIVE' && (
                          <button
                            type="button"
                            onClick={() => {
                              setLinkingRelative(p);
                              setTargetEmployeeCode(p.ownerId || '');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            title="Gán bảo trợ cho nhân viên"
                          >
                            <Link2 size={12} /> Gán NV
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Sắp / Ghép Phòng cho Admin theo mẫu chuẩn Hình 3 */}
      {arrangingPerson && (
        <RoomModal
          isOpen={!!arrangingPerson}
          onClose={() => setArrangingPerson(null)}
          onSaveRoom={(cap, memberIds) => {
            const handleSave = onSaveRoomForPerson || onCreateRoomForPerson;
            if (handleSave) {
              handleSave(cap, memberIds, arrangingPerson.roomId || undefined);
            }
            setArrangingPerson(null);
          }}
          currentEmployee={arrangingPerson}
          allPeople={people}
          editingRoom={arrangingPerson.roomId ? (rooms.find(r => r.id === arrangingPerson.roomId) || null) : null}
          maxChildrenPerRoom={currentTrip?.maxChildrenPerRoom || 2}
          currentTrip={currentTrip}
          allRooms={rooms}
        />
      )}

      {/* Modal Gán Người Thân */}
      {linkingRelative && (
        <div className="modal-overlay" onClick={() => setLinkingRelative(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Gán Người Thân Cho Nhân Viên Bảo Trợ
              </h3>
              <button onClick={() => setLinkingRelative(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-muted)', marginBottom: 14 }}>
                <div style={{ fontWeight: 700 }}>{linkingRelative.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {linkingRelative.store} • {getRelationText(linkingRelative.relation, linkingRelative.type, linkingRelative.slot)}
                </div>
              </div>

              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: 6 }}>
                Chọn nhân viên cùng siêu thị để bảo trợ:
              </label>

              <select
                value={targetEmployeeCode}
                onChange={e => setTargetEmployeeCode(e.target.value)}
                className="input-field"
                style={{ marginBottom: 16 }}
              >
                <option value="">-- Chọn nhân viên --</option>
                {candidateEmployeesForLinking.map(emp => (
                  <option key={emp.id} value={emp.code}>
                    {emp.name} ({emp.code} - {emp.gender === 'M' ? 'Nam' : 'Nữ'})
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setLinkingRelative(null)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleConfirmLink} disabled={!targetEmployeeCode}>
                  Xác Nhận Gán
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Người Khỏi Phòng */}
      {personToRemoveFromRoom && (
        <div className="modal-overlay" onClick={() => setPersonToRemoveFromRoom(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-danger)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: 'var(--color-danger)' }}>
              Xác Nhận Xóa Khỏi Phòng {personToRemoveFromRoom.room.code}?
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Bạn có chắc chắn muốn đưa <strong>{personToRemoveFromRoom.person.name}</strong> (Mã: {personToRemoveFromRoom.person.code}) ra khỏi phòng <strong>{personToRemoveFromRoom.room.code}</strong>?
              {personToRemoveFromRoom.room.memberIds.length <= 1 && (
                <span style={{ display: 'block', marginTop: 8, color: 'var(--color-danger)', fontWeight: 600 }}>
                  (Phòng {personToRemoveFromRoom.room.code} sẽ được tự động xóa/giải tán do không còn thành viên nào khác)
                </span>
              )}
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setPersonToRemoveFromRoom(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1.3, fontWeight: 700 }}
                onClick={() => {
                  if (onRemoveMemberFromRoom) {
                    onRemoveMemberFromRoom(personToRemoveFromRoom.room.id, personToRemoveFromRoom.person.id);
                  }
                  setPersonToRemoveFromRoom(null);
                }}
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
