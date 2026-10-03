import React, { useState, useMemo } from 'react';
import { Person, Gender, Room, Trip } from '../types';
import { removeVietnameseTones } from '../utils/textUtils';
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
  Plus
} from 'lucide-react';

interface AdminPeopleManagerProps {
  people: Person[];
  rooms: Room[];
  currentTrip?: Trip;
  onToggleGender: (personId: string) => void;
  onAssignRelative: (relativeId: string, employeeCode: string) => void;
  onAddMemberToRoom?: (roomId: string, personId: string) => void;
  onRemoveMemberFromRoom?: (roomId: string, personId: string) => void;
  onCreateRoomForPerson?: (capacity: number, memberIds: string[]) => void;
}

export const AdminPeopleManager: React.FC<AdminPeopleManagerProps> = ({
  people,
  rooms,
  currentTrip,
  onToggleGender,
  onAssignRelative,
  onAddMemberToRoom,
  onRemoveMemberFromRoom,
  onCreateRoomForPerson
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EMPLOYEE' | 'RELATIVE' | 'PG'>('ALL');
  const [roomFilter, setRoomFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [selectedStore, setSelectedStore] = useState<string>('ALL');

  // Modal gán người thân cho nhân viên
  const [linkingRelative, setLinkingRelative] = useState<Person | null>(null);
  const [targetEmployeeCode, setTargetEmployeeCode] = useState<string>('');

  // Modal sắp / xếp phòng cho nhân sự
  const [arrangingPerson, setArrangingPerson] = useState<Person | null>(null);
  const [roomSearchTerm, setRoomSearchTerm] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(2);

  const roomsMap = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);
  const peopleMap = useMemo(() => new Map(people.map(p => [p.id, p])), [people]);

  // Danh sách các phòng còn chỗ trống
  const availableRooms = useMemo(() => {
    return rooms.filter(r => r.usedSlots < r.capacity);
  }, [rooms]);

  // Lọc phòng theo tìm kiếm
  const filteredAvailableRooms = useMemo(() => {
    if (!roomSearchTerm.trim()) return availableRooms;
    const clean = removeVietnameseTones(roomSearchTerm).toLowerCase();
    return availableRooms.filter(r => {
      const matchCode = r.code.toLowerCase().includes(clean);
      const members = r.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
      const matchMember = members.some(m => removeVietnameseTones(m.name).toLowerCase().includes(clean) || m.code.toLowerCase().includes(clean));
      return matchCode || matchMember;
    });
  }, [availableRooms, roomSearchTerm, peopleMap]);

  const handleAssignToExistingRoom = (targetRoom: Room) => {
    if (!arrangingPerson) return;
    if (arrangingPerson.roomId && arrangingPerson.roomId !== targetRoom.id) {
      if (onRemoveMemberFromRoom) {
        onRemoveMemberFromRoom(arrangingPerson.roomId, arrangingPerson.id);
      }
    }
    if (onAddMemberToRoom) {
      onAddMemberToRoom(targetRoom.id, arrangingPerson.id);
    }
    setArrangingPerson(null);
  };

  const handleCreateNewRoomForPerson = () => {
    if (!arrangingPerson) return;
    if (arrangingPerson.roomId) {
      if (onRemoveMemberFromRoom) {
        onRemoveMemberFromRoom(arrangingPerson.roomId, arrangingPerson.id);
      }
    }
    if (onCreateRoomForPerson) {
      onCreateRoomForPerson(newRoomCapacity, [arrangingPerson.id]);
    }
    setArrangingPerson(null);
  };

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
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, flex: '1 1 300px' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: 220, flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
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
            className="input-field"
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
            className="input-field"
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
            className="input-field"
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
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
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
                          <div>{p.relation || 'Chưa rõ'}</div>
                          {p.ownerId ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 600 }}>
                              NV: {p.ownerId}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                              Chưa gắn nhân viên
                            </div>
                          )}
                        </div>
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
                              onClick={() => {
                                setArrangingPerson(p);
                                setRoomSearchTerm('');
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title={`Đang ở phòng ${room.code} - Bấm để chuyển phòng khác`}
                            >
                              <RotateCcw size={12} /> Đổi phòng
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onRemoveMemberFromRoom && confirm(`Bạn có chắc muốn đưa ${p.name} ra khỏi phòng ${room.code}?`)) {
                                  onRemoveMemberFromRoom(room.id, p.id);
                                }
                              }}
                              className="btn btn-danger btn-sm"
                              style={{ padding: '3px 7px', fontSize: '0.74rem' }}
                              title={`Rời khỏi phòng ${room.code}`}
                            >
                              <UserX size={12} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setArrangingPerson(p);
                              setRoomSearchTerm('');
                            }}
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

      {/* Modal Sắp / Xếp Phòng Cho Nhân Sự */}
      {arrangingPerson && (
        <div className="modal-overlay" onClick={() => setArrangingPerson(null)} style={{ zIndex: 1200 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card-solid)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bed size={20} style={{ color: 'var(--primary-500)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Sắp Phòng Cho {arrangingPerson.name}
                </h3>
              </div>
              <button onClick={() => setArrangingPerson(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Thông tin nhân sự */}
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                    {arrangingPerson.name} <span style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-muted)' }}>({arrangingPerson.code})</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    🏢 {arrangingPerson.store} • {arrangingPerson.type === 'EMPLOYEE' ? 'Nhân viên' : (arrangingPerson.type === 'RELATIVE' ? 'Người thân' : 'PG')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={`badge ${arrangingPerson.gender === 'M' ? 'badge-primary' : 'badge-warning'}`}>
                    {arrangingPerson.gender === 'M' ? 'Nam' : 'Nữ'}
                  </span>
                  {arrangingPerson.roomId ? (
                    <span className="badge badge-success">
                      Phòng hiện tại: {roomsMap.get(arrangingPerson.roomId)?.code}
                    </span>
                  ) : (
                    <span className="badge badge-gray">Chưa có phòng</span>
                  )}
                </div>
              </div>

              {/* Tùy chọn 1: Ghép vào phòng có sẵn còn chỗ */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>
                    1. Ghép vào phòng có sẵn còn chỗ trống ({availableRooms.length} phòng):
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Tìm theo số phòng, tên thành viên..."
                    value={roomSearchTerm}
                    onChange={e => setRoomSearchTerm(e.target.value)}
                    style={{ height: 32, fontSize: '0.78rem', width: 220, padding: '4px 8px' }}
                  />
                </div>

                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg-main)' }}>
                  {filteredAvailableRooms.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                      Không có phòng nào phù hợp hoặc tất cả các phòng đã đủ người.
                    </div>
                  ) : (
                    filteredAvailableRooms.map(r => {
                      const members = r.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
                      const isSameGender = members.every(m => m.gender === arrangingPerson.gender);
                      const availableSlots = r.capacity - r.usedSlots;

                      return (
                        <div
                          key={r.id}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-card-solid)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)', minWidth: 46 }}>
                              {r.code}
                            </span>
                            <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                              Phòng {r.capacity} người
                            </span>
                            <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                              Còn {availableSlots} chỗ
                            </span>
                            {isSameGender && (
                              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                                Cùng giới ({arrangingPerson.gender === 'M' ? 'Nam' : 'Nữ'})
                              </span>
                            )}
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              ({members.map(m => m.name).join(', ')})
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAssignToExistingRoom(r)}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '4px 10px', whiteSpace: 'nowrap', fontWeight: 700 }}
                          >
                            + Ghép vào phòng
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Tùy chọn 2: Hoặc tạo phòng mới cho nhân sự này */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>
                  2. Hoặc tạo phòng mới cho {arrangingPerson.name}:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Loại phòng:</span>
                    {[2, 3, 4, 5, 6].map(cap => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setNewRoomCapacity(cap)}
                        className={`btn btn-sm ${newRoomCapacity === cap ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                      >
                        {cap} người
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateNewRoomForPerson}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '6px 14px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <Plus size={14} /> Tạo phòng {newRoomCapacity} người
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-muted)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setArrangingPerson(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
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
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{linkingRelative.store} • {linkingRelative.relation || 'Người thân'}</div>
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
    </div>
  );
};
