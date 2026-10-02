import React, { useState, useMemo } from 'react';
import { Person, Gender, Room } from '../types';
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
  Users
} from 'lucide-react';

interface AdminPeopleManagerProps {
  people: Person[];
  rooms: Room[];
  onToggleGender: (personId: string) => void;
  onAssignRelative: (relativeId: string, employeeCode: string) => void;
}

export const AdminPeopleManager: React.FC<AdminPeopleManagerProps> = ({
  people,
  rooms,
  onToggleGender,
  onAssignRelative
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EMPLOYEE' | 'RELATIVE' | 'PG'>('ALL');
  const [roomFilter, setRoomFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [selectedStore, setSelectedStore] = useState<string>('ALL');

  // Modal gán người thân cho nhân viên
  const [linkingRelative, setLinkingRelative] = useState<Person | null>(null);
  const [targetEmployeeCode, setTargetEmployeeCode] = useState<string>('');

  const roomsMap = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);

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

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {p.type === 'RELATIVE' && (
                        <button
                          onClick={() => {
                            setLinkingRelative(p);
                            setTargetEmployeeCode(p.ownerId || '');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                          title="Gán bảo trợ cho nhân viên"
                        >
                          <Link2 size={13} /> Gán NV
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
