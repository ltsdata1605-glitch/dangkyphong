import React, { useState, useMemo, useEffect } from 'react';
import { Person, Room, Trip, BedType } from '../types';
import { validateRoom, canAddPersonToRoom } from '../services/roomingEngine';
import { removeVietnameseTones } from '../utils/textUtils';
import confetti from 'canvas-confetti';
import {
  X,
  Users,
  Bed,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Search,
  Baby,
  User,
  HeartHandshake,
  Info
} from 'lucide-react';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRoom: (capacity: number, memberIds: string[]) => void;
  currentEmployee: Person;
  allPeople: Person[];
  editingRoom?: Room | null;
  maxChildrenPerRoom?: number;
  currentTrip?: Trip;
  allRooms?: Room[];
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  onSaveRoom,
  currentEmployee,
  allPeople,
  editingRoom,
  maxChildrenPerRoom = 2,
  currentTrip,
  allRooms = []
}) => {
  // Thống kê số lượng phòng đã đăng ký theo từng loại (ngoại trừ chính phòng đang sửa nếu có)
  const roomCountByCap = useMemo(() => {
    const counts: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    if (!allRooms || !currentTrip) return counts;
    allRooms.forEach(r => {
      if (r.tripId === currentTrip.id && (!editingRoom || r.id !== editingRoom.id)) {
        counts[r.capacity] = (counts[r.capacity] || 0) + 1;
      }
    });
    return counts;
  }, [allRooms, currentTrip, editingRoom]);

  const [capacity, setCapacity] = useState<number>(() => {
    if (editingRoom) return editingRoom.capacity;
    // Chọn loại phòng còn trống đầu tiên (2, 3, 4, 5, 6)
    const availableCap = [2, 3, 4, 5, 6].find(c => {
      const maxLimit = currentTrip?.roomLimits?.[c];
      const count = roomCountByCap[c] || 0;
      return maxLimit === undefined || count < maxLimit;
    });
    return availableCap || 2;
  });

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => {
    if (editingRoom) return [...editingRoom.memberIds];
    // Mặc định ban đầu: bản thân nhân viên + tất cả người thân của nhân viên đó
    const myRelatives = allPeople.filter(p => p.type === 'RELATIVE' && p.ownerId === currentEmployee.code && !p.roomId);
    return [currentEmployee.id, ...myRelatives.map(r => r.id)];
  });

  // Tự động chuyển loại phòng nếu loại phòng hiện tại đã đạt định mức tối đa
  useEffect(() => {
    if (!currentTrip?.roomLimits) return;
    const maxLimit = currentTrip.roomLimits[capacity];
    const currentCount = roomCountByCap[capacity] || 0;
    const isCurrentFull = maxLimit !== undefined && currentCount >= maxLimit && (!editingRoom || editingRoom.capacity !== capacity);

    if (isCurrentFull) {
      // Tìm loại phòng tiếp theo còn chỉ tiêu và đủ chỗ cho số người hiện tại
      const adultCount = selectedMemberIds
        .map(id => allPeople.find(p => p.id === id)!)
        .filter(p => p && p.slot > 0).length;
      
      const nextAvailable = [2, 3, 4, 5, 6].find(c => {
        if (c < Math.max(2, adultCount)) return false;
        const lim = currentTrip.roomLimits?.[c];
        const cnt = roomCountByCap[c] || 0;
        return lim === undefined || cnt < lim;
      });

      if (nextAvailable && nextAvailable !== capacity) {
        setCapacity(nextAvailable);
      }
    }
  }, [capacity, roomCountByCap, currentTrip, editingRoom, selectedMemberIds, allPeople]);

  const [searchTerm, setSearchTerm] = useState('');

  // Lấy các đối tượng Person hiện đang được chọn
  const currentMembers = useMemo(() => {
    return selectedMemberIds
      .map(id => allPeople.find(p => p.id === id)!)
      .filter(Boolean);
  }, [selectedMemberIds, allPeople]);

  // Kiểm tra tính hợp lệ của phòng theo các quy tắc
  const validation = useMemo(() => {
    return validateRoom(currentMembers, capacity, maxChildrenPerRoom, false);
  }, [currentMembers, capacity, maxChildrenPerRoom]);

  const [filterType, setFilterType] = useState<'ALL' | 'SAME_STORE' | 'AVAILABLE' | 'EMPLOYEES_ONLY'>('ALL');
  const [filterGender, setFilterGender] = useState<'ALL' | 'M' | 'F'>('ALL');

  // Danh sách TẤT CẢ những người khả dụng để thêm vào (không cắt ngắn slice)
  const availableCandidates = useMemo(() => {
    let unselected = allPeople.filter(p => !selectedMemberIds.includes(p.id));

    // Bộ lọc theo loại
    if (filterType === 'SAME_STORE') {
      unselected = unselected.filter(p => p.store === currentEmployee.store);
    } else if (filterType === 'AVAILABLE') {
      unselected = unselected.filter(p => !p.roomId);
    } else if (filterType === 'EMPLOYEES_ONLY') {
      unselected = unselected.filter(p => p.type === 'EMPLOYEE');
    }

    // Bộ lọc theo giới tính
    if (filterGender !== 'ALL') {
      unselected = unselected.filter(p => p.gender === filterGender);
    }

    // Bộ lọc tìm kiếm
    if (searchTerm.trim()) {
      const cleanSearch = removeVietnameseTones(searchTerm);
      unselected = unselected.filter(p => {
        const matchName = removeVietnameseTones(p.name).includes(cleanSearch);
        const matchCode = p.code.toLowerCase().includes(cleanSearch);
        const matchStore = removeVietnameseTones(p.store).includes(cleanSearch);
        return matchName || matchCode || matchStore;
      });
    }

    // Sắp xếp thông minh:
    // 1. Cùng siêu thị lên trước
    // 2. Chưa có phòng lên trước
    // 3. Nhân viên lên trước
    return unselected.sort((a, b) => {
      const aSameStore = a.store === currentEmployee.store ? 1 : 0;
      const bSameStore = b.store === currentEmployee.store ? 1 : 0;
      if (aSameStore !== bSameStore) return bSameStore - aSameStore;

      const aAvailable = !a.roomId ? 1 : 0;
      const bAvailable = !b.roomId ? 1 : 0;
      if (aAvailable !== bAvailable) return bAvailable - aAvailable;

      const aEmp = a.type === 'EMPLOYEE' ? 1 : 0;
      const bEmp = b.type === 'EMPLOYEE' ? 1 : 0;
      if (aEmp !== bEmp) return bEmp - aEmp;

      return a.name.localeCompare(b.name);
    });
  }, [allPeople, selectedMemberIds, searchTerm, filterType, filterGender, currentEmployee.store]);

  // Thêm một thành viên vào phòng
  const handleAddMember = (person: Person) => {
    if (selectedMemberIds.length >= 6) {
      alert('Một phòng chỉ được tối đa 6 người. Không thể thêm tiếp!');
      return;
    }

    const nextMemberIds = [...selectedMemberIds, person.id];
    setSelectedMemberIds(nextMemberIds);

    // Tự động nâng loại phòng nếu số người lớn vượt quá sức chứa ban đầu (tối đa 6 người)
    const nextMembers = nextMemberIds.map(id => allPeople.find(p => p.id === id)!).filter(Boolean);
    const nextAdults = nextMembers.filter(m => m.slot > 0).length;
    if (nextAdults > capacity) {
      // Tìm loại phòng nhỏ nhất >= nextAdults mà chưa đầy
      const targetCap = [nextAdults, nextAdults + 1, nextAdults + 2, nextAdults + 3, 6].find(c => {
        if (c > 6) return false;
        const lim = currentTrip?.roomLimits?.[c];
        const cnt = roomCountByCap[c] || 0;
        return lim === undefined || cnt < lim;
      });
      setCapacity(targetCap || Math.min(6, nextAdults));
    }
  };

  // Xóa một thành viên ra khỏi phòng (không cho xóa bản thân nếu là người tạo)
  const handleRemoveMember = (personId: string) => {
    if (personId === currentEmployee.id && !editingRoom) {
      alert('Bạn là người tạo phòng, không thể tự xóa bản thân khỏi phòng này.');
      return;
    }
    setSelectedMemberIds(prev => prev.filter(id => id !== personId));
  };

  const handleSave = () => {
    let finalCapacity = capacity;
    const maxLimit = currentTrip?.roomLimits?.[finalCapacity];
    const currentCount = roomCountByCap[finalCapacity] || 0;
    if (maxLimit !== undefined && currentCount >= maxLimit && (!editingRoom || editingRoom.capacity !== finalCapacity)) {
      // Tự động tìm loại phòng tiếp theo còn trống
      const adultCount = currentMembers.filter(m => m.slot > 0).length;
      const nextAvailable = [2, 3, 4, 5, 6].find(c => {
        if (c < Math.max(2, adultCount)) return false;
        const lim = currentTrip?.roomLimits?.[c];
        const cnt = roomCountByCap[c] || 0;
        return lim === undefined || cnt < lim;
      });

      if (nextAvailable) {
        alert(`Loại phòng ${finalCapacity} người đã đạt định mức tối đa (${currentCount}/${maxLimit} phòng). Hệ thống đã tự động chuyển sang phòng ${nextAvailable} người.`);
        finalCapacity = nextAvailable;
        setCapacity(nextAvailable);
      } else {
        alert(`Loại phòng ${finalCapacity} người đã đạt giới hạn tối đa (${currentCount}/${maxLimit} phòng) và khách sạn không còn loại phòng nào khác còn chỗ.`);
        return;
      }
    }

    if (!validation.valid) {
      alert(validation.errors.join('\n'));
      return;
    }

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignored if confetti fails
    }

    onSaveRoom(finalCapacity, selectedMemberIds);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-card-solid)',
          zIndex: 10
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              {editingRoom ? `Chỉnh Sửa Phòng ${editingRoom.code}` : 'Đăng Ký & Ghép Phòng Khách Sạn'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Trưởng phòng: <strong>{currentEmployee.name}</strong> ({currentEmployee.code})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px' }}>
          {/* Step 1: Select Room Capacity */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>
              1. Chọn Loại Phòng (Số suất người lớn):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {[2, 3, 4, 5, 6].map(cap => {
                const maxLimit = currentTrip?.roomLimits?.[cap];
                const count = roomCountByCap[cap] || 0;
                const isFull = maxLimit !== undefined && count >= maxLimit && (!editingRoom || editingRoom.capacity !== cap);
                const isSelected = capacity === cap;

                return (
                  <button
                    key={cap}
                    type="button"
                    disabled={isFull}
                    onClick={() => setCapacity(cap)}
                    title={isFull ? `Đã hết suất phòng ${cap} người (${count}/${maxLimit} phòng)` : undefined}
                    style={{
                      padding: '10px 4px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected
                        ? '2px solid var(--primary-500)'
                        : isFull
                          ? '1.5px dashed var(--border-subtle)'
                          : '1px solid var(--border-subtle)',
                      background: isSelected
                        ? 'var(--primary-gradient)'
                        : isFull
                          ? 'var(--bg-muted)'
                          : 'var(--bg-card-solid)',
                      color: isSelected
                        ? '#fff'
                        : isFull
                          ? 'var(--text-muted)'
                          : 'var(--text-main)',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 700,
                      cursor: isFull ? 'not-allowed' : 'pointer',
                      opacity: isFull ? 0.55 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      position: 'relative',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Users size={18} style={{ opacity: isFull ? 0.4 : 1 }} />
                    <span style={{ fontSize: '0.85rem' }}>{cap} Người</span>
                    {maxLimit !== undefined && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: isSelected ? '#fff' : isFull ? 'var(--color-danger)' : 'var(--text-muted)',
                          lineHeight: 1
                        }}
                      >
                        {isFull ? 'Hết phòng' : `${count}/${maxLimit}p`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Cảnh báo khi có loại phòng đã hết suất (Hình 1) */}
            {(() => {
              const fullCaps = [2, 3, 4, 5, 6].filter(c => {
                const max = currentTrip?.roomLimits?.[c];
                return max !== undefined && (roomCountByCap[c] || 0) >= max;
              });

              if (fullCaps.length === 0) return null;

              return (
                <div style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: 'var(--color-danger)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Cảnh báo định mức:</strong> {fullCaps.map(c => `Phòng ${c} người (${roomCountByCap[c]}/${currentTrip?.roomLimits?.[c]} phòng)`).join(', ')} đã hết suất đăng ký trong chuyến đi này. Vui lòng chọn loại phòng khác còn trống!
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Live Capacity Meter & Bed Suggestion */}
          <div style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-muted)',
            border: '1px solid var(--border-subtle)',
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                Tiến độ xếp chỗ:
              </div>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                color: validation.usedSlots > capacity ? 'var(--color-danger)' : 'var(--primary-500)',
                fontSize: '0.95rem'
              }}>
                {validation.usedSlots} / {capacity} Suất Người Lớn
                {validation.childCount > 0 && ` · ${validation.childCount} Trẻ em ở ghép`}
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: 8,
              borderRadius: 'var(--radius-full)',
              background: 'var(--border-subtle)',
              overflow: 'hidden',
              marginBottom: 10
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (validation.usedSlots / capacity) * 100)}%`,
                background: validation.usedSlots > capacity ? 'var(--danger-gradient)' : 'var(--primary-gradient)',
                transition: 'width 0.3s ease'
              }} />
            </div>

            {/* Suggested Bed Type */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <Bed size={15} style={{ color: 'var(--primary-500)' }} />
              <span>Kiểu giường gợi ý: </span>
              <strong style={{ color: 'var(--text-main)' }}>
                {validation.bedType === 'DOUBLE' && 'Double (1 Giường đôi lớn - Vợ chồng)'}
                {validation.bedType === 'TWIN' && 'Twin (2 Giường đơn - Đồng nghiệp)'}
                {validation.bedType === 'TRIPLE' && 'Triple (3 Giường / Giường phụ)'}
                {validation.bedType === 'FAMILY' && 'Family (Gia đình có trẻ nhỏ)'}
              </strong>
            </div>

            {/* Ghi chú bé < 11 tuổi */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.8rem',
              color: '#b45309',
              background: 'rgba(245, 158, 11, 0.12)',
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              marginTop: 10
            }}>
              <Info size={15} style={{ flexShrink: 0 }} />
              <span>
                <strong>Ghi chú:</strong> Nếu bé &lt; 11 tuổi sẽ không tính vào số lượng người trong phòng (ngủ cùng người thân).
              </span>
            </div>
          </div>

          {/* Validation Errors & Warnings Alert */}
          {validation.errors.length > 0 && (
            <div style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-danger)',
              fontSize: '0.86rem'
            }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <AlertTriangle size={16} /> Không thể lưu phòng do vi phạm quy tắc:
              </div>
              <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings.length > 0 && validation.errors.length === 0 && (
            <div style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: 'var(--color-warning)',
              fontSize: '0.84rem'
            }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={15} /> Lưu ý:
              </div>
              <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                {validation.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 2: Current Selected Members in Room */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>
              2. Danh Sách Thành Viên Trong Phòng ({currentMembers.length}):
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentMembers.map(m => {
                const isLeader = m.id === currentEmployee.id;
                let relLabel = m.type === 'EMPLOYEE' ? 'Nhân viên' : (m.relation || 'Người thân');
                if (m.relation === 'SPOUSE') relLabel = 'Vợ / Chồng';
                else if (m.relation === 'PARENT') relLabel = 'Ba / Mẹ';
                else if (m.relation === 'CHILD_U5') relLabel = 'Con (<5 tuổi)';
                else if (m.relation === 'CHILD_5_11') relLabel = 'Con (5-11 tuổi)';
                else if (m.relation === 'CHILD_12P') relLabel = 'Con (>=12 tuổi)';
                else if (m.type === 'PG') relLabel = 'PG Độc Lập';

                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card-solid)',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: m.gender === 'M' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(236, 72, 153, 0.12)',
                        color: m.gender === 'M' ? 'var(--primary-500)' : '#ec4899',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}>
                        {m.slot === 0 ? <Baby size={18} /> : (m.gender === 'M' ? 'Nam' : 'Nữ')}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {m.name}
                          {isLeader && (
                            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Trưởng phòng</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span>{relLabel}</span>
                          <span>•</span>
                          <span>{m.slot === 0 ? '0 suất (ở ghép)' : '1 suất'}</span>
                          <span>•</span>
                          <span>{m.code}</span>
                        </div>
                      </div>
                    </div>

                    {!isLeader && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 10px', color: 'var(--color-danger)' }}
                        title="Bỏ ra khỏi phòng"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Candidate Search & Picker */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <label style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>
                3. Chọn Thêm Đồng Nghiệp / Người Thân:
              </label>
              <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                Hiển thị tất cả: {availableCandidates.length} người
              </span>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Tìm đồng nghiệp theo tên, MSNV, siêu thị..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 38, fontSize: '0.88rem' }}
              />
            </div>

            {/* Quick Filter Chips */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`btn btn-sm ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.76rem', padding: '4px 10px', height: 28 }}
              >
                Tất cả ({allPeople.length - selectedMemberIds.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('SAME_STORE')}
                className={`btn btn-sm ${filterType === 'SAME_STORE' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.76rem', padding: '4px 10px', height: 28 }}
              >
                🏢 Cùng siêu thị
              </button>

              <button
                type="button"
                onClick={() => setFilterType('EMPLOYEES_ONLY')}
                className={`btn btn-sm ${filterType === 'EMPLOYEES_ONLY' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.76rem', padding: '4px 10px', height: 28 }}
              >
                👥 Nhân viên
              </button>

              <button
                type="button"
                onClick={() => setFilterType('AVAILABLE')}
                className={`btn btn-sm ${filterType === 'AVAILABLE' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.76rem', padding: '4px 10px', height: 28 }}
              >
                ⏳ Chưa có phòng
              </button>

              {/* Gender filter */}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setFilterGender(filterGender === 'M' ? 'ALL' : 'M')}
                  className={`btn btn-sm ${filterGender === 'M' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.74rem', padding: '4px 8px', height: 28 }}
                >
                  Nam
                </button>
                <button
                  type="button"
                  onClick={() => setFilterGender(filterGender === 'F' ? 'ALL' : 'F')}
                  className={`btn btn-sm ${filterGender === 'F' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.74rem', padding: '4px 8px', height: 28 }}
                >
                  Nữ
                </button>
              </div>
            </div>

            <div style={{
              maxHeight: 380,
              overflowY: 'auto',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card-solid)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)'
            }}>
              {availableCandidates.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Không tìm thấy người phù hợp hoặc tất cả đã được xếp phòng.
                </div>
              ) : (
                availableCandidates.map(person => {
                  const checkAdd = canAddPersonToRoom(person, currentMembers, capacity, editingRoom ? editingRoom.id : null);
                  const canAdd = checkAdd.allowed;

                  return (
                    <div
                      key={person.id}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        opacity: canAdd ? 1 : 0.55,
                        background: canAdd ? (checkAdd.warning ? 'rgba(249, 115, 22, 0.04)' : 'transparent') : 'rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{person.name}</span>
                          <span className={`badge ${person.gender === 'M' ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                            {person.gender === 'M' ? 'Nam' : 'Nữ'}
                          </span>
                          <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>
                            {person.code}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {person.store}
                        </div>
                        {!canAdd && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-danger)', fontWeight: 600, marginTop: 2 }}>
                            ✕ {checkAdd.reason}
                          </div>
                        )}
                        {canAdd && checkAdd.warning && (
                          <div style={{ fontSize: '0.73rem', color: '#c2410c', fontWeight: 600, marginTop: 3, lineHeight: 1.35 }}>
                            {checkAdd.warning}
                          </div>
                        )}
                      </div>

                      {canAdd ? (
                        <button
                          type="button"
                          onClick={() => handleAddMember(person)}
                          className={checkAdd.warning ? "btn btn-outline btn-sm" : "btn btn-secondary btn-sm"}
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderColor: checkAdd.warning ? '#ea580c' : undefined,
                            color: checkAdd.warning ? '#ea580c' : undefined,
                            flexShrink: 0
                          }}
                        >
                          <Plus size={14} /> Thêm
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', flexShrink: 0 }}>
                          Không thể thêm
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          background: 'var(--bg-card-solid)',
          position: 'sticky',
          bottom: 0
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Đóng
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!validation.valid}
            style={{ opacity: validation.valid ? 1 : 0.6 }}
          >
            <CheckCircle size={18} />
            Lưu Phòng ({validation.usedSlots}/{capacity} suất)
          </button>
        </div>
      </div>
    </div>
  );
};
