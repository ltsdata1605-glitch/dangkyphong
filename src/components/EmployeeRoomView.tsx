import React, { useState, useMemo } from 'react';
import { Person, Room, Trip, RelationType } from '../types';
import { EmployeeRelativeClaim } from './EmployeeRelativeClaim';
import { RoomingProcessGuide } from './RoomingProcessGuide';
import { RoomModal } from './RoomModal';
import { canAddPersonToRoom } from '../services/roomingEngine';
import {
  Bed,
  Users,
  LogOut,
  Edit,
  Trash2,
  PlusCircle,
  AlertCircle,
  CheckCircle,
  Building,
  Baby,
  Heart,
  Crown,
  Search,
  UserMinus,
  Info
} from 'lucide-react';

interface EmployeeRoomViewProps {
  currentEmployee: Person;
  currentTrip: Trip;
  allPeople: Person[];
  allRooms: Room[];
  onSaveRoom: (capacity: number, memberIds: string[], editingRoomId?: string) => void;
  onLeaveRoom: (personId: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onClaimRelative: (relativeId: string, relation?: RelationType) => void;
  onUnclaimRelative?: (relativeId: string) => void;
  onOpenAllRooms?: () => void;
  onJoinRoom?: (roomId: string, personId: string) => Promise<boolean> | void;
}

export const EmployeeRoomView: React.FC<EmployeeRoomViewProps> = ({
  currentEmployee,
  currentTrip,
  allPeople,
  allRooms,
  onSaveRoom,
  onLeaveRoom,
  onDeleteRoom,
  onClaimRelative,
  onUnclaimRelative,
  onOpenAllRooms,
  onJoinRoom
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Tìm phòng hiện tại của nhân viên (chỉ khi nhân viên có roomId và phòng đó chứa nhân viên)
  const myRoom = currentEmployee.roomId
    ? allRooms.find(r => r.id === currentEmployee.roomId && (r.memberIds.includes(currentEmployee.id) || r.memberIds.includes(currentEmployee.code)))
    : null;
  const isLeader = myRoom ? (myRoom.leaderId === currentEmployee.id || myRoom.leaderId === currentEmployee.code) : false;

  // Thành viên trong phòng hiện tại
  const roomMembers = myRoom
    ? myRoom.memberIds.map(id => allPeople.find(p => p.id === id || p.code === id)!).filter(Boolean)
    : [];

  const leaderPerson = myRoom
    ? allPeople.find(p => p.id === myRoom.leaderId || p.code === myRoom.leaderId)
    : null;

  // Quản lý trạng thái xác nhận / đóng thông báo phòng
  const [acknowledgedRoomId, setAcknowledgedRoomId] = useState<string | null>(() => {
    return myRoom ? localStorage.getItem(`room_ack_${myRoom.id}_${currentEmployee.id}`) : null;
  });

  const isRoomAcknowledged = acknowledgedRoomId === myRoom?.id;

  const handleAcknowledgeRoom = () => {
    if (myRoom) {
      const key = `room_ack_${myRoom.id}_${currentEmployee.id}`;
      localStorage.setItem(key, myRoom.id);
      setAcknowledgedRoomId(myRoom.id);
    }
  };

  // Người thân thuộc quyền bảo trợ của nhân viên này (bao gồm cả vợ/chồng là nhân viên)
  const myRelatives = allPeople.filter(p => p.ownerId === currentEmployee.code && p.id !== currentEmployee.id);

  const isLocked = currentTrip.isLocked;

  // Tìm các phòng chưa đủ người (status UNDER hoặc usedSlots < capacity) phù hợp với người dùng
  const underCapacityRooms = useMemo(() => {
    if (myRoom) return []; // Đã có phòng thì không gợi ý ở mục Chưa có phòng
    return allRooms
      .filter(r => {
        if (r.tripId !== currentTrip.id) return false;
        if (!r.memberIds || r.memberIds.length === 0) return false;
        const isUnder = r.status === 'UNDER' || r.usedSlots < r.capacity || r.memberIds.length < r.capacity;
        if (!isUnder) return false;
        if (r.memberIds.length >= 6) return false;

        const members = r.memberIds.map(id => allPeople.find(p => p.id === id || p.code === id)!).filter(Boolean);
        const check = canAddPersonToRoom(currentEmployee, members, r.capacity, r.id);
        return check.allowed;
      })
      .sort((a, b) => {
        const membersA = a.memberIds.map(id => allPeople.find(p => p.id === id || p.code === id)!).filter(Boolean);
        const membersB = b.memberIds.map(id => allPeople.find(p => p.id === id || p.code === id)!).filter(Boolean);
        const sameStoreA = membersA.some(m => m.store === currentEmployee.store) ? 1 : 0;
        const sameStoreB = membersB.some(m => m.store === currentEmployee.store) ? 1 : 0;
        if (sameStoreB !== sameStoreA) return sameStoreB - sameStoreA;
        const diffA = a.capacity - a.usedSlots;
        const diffB = b.capacity - b.usedSlots;
        return diffA - diffB;
      });
  }, [allRooms, currentTrip.id, myRoom, allPeople, currentEmployee]);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = () => {
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAllSuggested, setShowAllSuggested] = useState(false);
  const [unclaimingRelative, setUnclaimingRelative] = useState<Person | null>(null);
  const [removingMember, setRemovingMember] = useState<Person | null>(null);

  const handleConfirmLeave = () => {
    setShowLeaveModal(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(true);
  };

  const executeDelete = () => {
    if (myRoom) {
      onDeleteRoom(myRoom.id);
    }
    setShowDeleteModal(false);
  };

  const executeLeave = () => {
    if (myRoom) {
      localStorage.removeItem(`room_ack_${myRoom.id}_${currentEmployee.id}`);
      setAcknowledgedRoomId(null);
    }
    onLeaveRoom(currentEmployee.id);
    setShowLeaveModal(false);
  };

  return (
    <div style={{ width: '100%', margin: '20px 0' }}>
      {/* 0. Hướng Dẫn Quy Trình Đăng Ký Phòng (3 Bước) */}
      <RoomingProcessGuide
        onOpenCreateRoom={handleOpenCreateModal}
        hasRoom={!!myRoom}
      />

      {/* 1. Relative Claim Alert (Hỗ trợ người thân cùng siêu thị & tìm ở siêu thị khác) */}
      <EmployeeRelativeClaim
        currentEmployee={currentEmployee}
        allPeople={allPeople}
        onClaimRelative={onClaimRelative}
      />

      {/* 1.5. Gợi Ý Các Phòng Đang Thiếu Người (Hiệu ứng nhấp nháy thu hút - Thiết kế siêu gọn) */}
      {!myRoom && underCapacityRooms.length > 0 && !isLocked && (
        <div className="room-under-suggestion-container" style={{ padding: '8px 10px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="badge badge-warning badge-blinking-urgent" style={{ fontSize: '0.66rem', padding: '2px 5px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span className="dot-blinking-urgent" />
                ⚡ CẦN GHÉP NGƯỜI
              </span>
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Gợi Ý {underCapacityRooms.length} Phòng Chưa Đủ Người Phù Hợp Với Bạn
              </h4>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Bấm <strong>Vào phòng</strong> để ghép ngay không sợ hết định mức!
            </span>
          </div>

          {/* Danh sách thẻ phòng gợi ý - Lưới 4 cột trên laptop, 3 cột tablet, 1-2 cột mobile */}
          <div className="suggested-rooms-grid">
            {underCapacityRooms.slice(0, showAllSuggested ? undefined : 8).map(room => {
              const members = room.memberIds.map(id => allPeople.find(p => p.id === id || p.code === id)!).filter(Boolean);
              const missingCount = Math.max(1, room.capacity - room.usedSlots);
              const hasSameStore = members.some(m => m.store === currentEmployee.store);
              const leader = members.find(m => m.id === room.leaderId || m.code === room.leaderId) || members[0];

              return (
                <div
                  key={room.id}
                  className="suggested-room-card"
                  style={{
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-card-solid)',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}
                >
                  {/* Hàng 1: Mã phòng, loại phòng, số chỗ thiếu + Nút Vào phòng */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minWidth: 0 }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)', minWidth: 34 }}>
                        {room.code}
                      </strong>
                      <span className="badge badge-gray" style={{ fontSize: '0.62rem', padding: '1px 4px' }}>
                        {room.capacity}ng · {room.bedType}
                      </span>
                      <span className="badge badge-warning badge-blinking-urgent" style={{ fontSize: '0.62rem', padding: '1px 4px', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <span className="dot-blinking-urgent" style={{ width: 5, height: 5 }} />
                        Thiếu {missingCount}
                      </span>
                      {hasSameStore && (
                        <span className="badge badge-primary" style={{ fontSize: '0.6rem', padding: '1px 3px' }}>
                          Cùng ST
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Bạn có chắc muốn đăng ký ghép vào phòng ${room.code} (${room.capacity} người) cùng đồng nghiệp ${leader?.name || ''}?`)) {
                          if (onJoinRoom) {
                            onJoinRoom(room.id, currentEmployee.id);
                          } else {
                            onSaveRoom(room.capacity, [...room.memberIds, currentEmployee.id], room.id);
                          }
                        }
                      }}
                      className="btn btn-primary btn-sm"
                      style={{
                        padding: '1px 6px',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        height: 22,
                        minHeight: 22,
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        flexShrink: 0
                      }}
                      title={`Bấm để vào ở ghép phòng ${room.code}`}
                    >
                      ⚡ Vào phòng
                    </button>
                  </div>

                  {/* Hàng 2: Thành viên hiện tại dạng chip siêu gọn */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    {members.map(m => {
                      const storeCode = m.store ? m.store.split('-')[0].trim() : '';
                      return (
                        <span
                          key={m.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                            padding: '1px 4px',
                            background: 'var(--bg-muted)',
                            borderRadius: 3,
                            fontSize: '0.65rem',
                            border: '1px solid var(--border-subtle)',
                            maxWidth: '100%',
                            lineHeight: 1.2
                          }}
                          title={`${m.name} - ${m.store}`}
                        >
                          <span className={`badge ${m.gender === 'M' ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.55rem', padding: '0 2px' }}>
                            {m.gender === 'M' ? 'Nam' : 'Nữ'}
                          </span>
                          <strong style={{ whiteSpace: 'nowrap' }}>{m.name}</strong>
                          {storeCode && <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>({storeCode})</span>}
                          {(m.id === room.leaderId || m.code === room.leaderId) && <Crown size={9} style={{ color: '#d97706', flexShrink: 0 }} />}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nút Xem thêm phòng nếu > 8 phòng */}
          {underCapacityRooms.length > 8 && (
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setShowAllSuggested(!showAllSuggested)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '2px 8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                {showAllSuggested ? 'Thu gọn' : `Xem thêm ${underCapacityRooms.length - 8} phòng khác ▾`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Room Status Section */}
      <div className="glass-card emp-no-room-card" style={{ padding: '16px 14px', marginBottom: 16 }}>
        {!myRoom ? (
          /* Case A: Not in any room */
          <div style={{ textAlign: 'center', padding: '8px 4px' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(37, 99, 235, 0.1)',
              color: 'var(--primary-500)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8
            }}>
              <Bed size={22} />
            </div>

            <h3 style={{ fontSize: '1.08rem', fontWeight: 800, marginBottom: 4 }}>
              Bạn Chưa Có Phòng Khách Sạn
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', maxWidth: 480, margin: '0 auto 8px auto', lineHeight: 1.45 }}>
              Thực hiện theo 3 bước: <strong>1. Chọn người thân</strong> (chọn mối quan hệ) → <strong>2. Tự động tạo phòng 2 người</strong> → <strong>3. Ghép thêm người ở cùng</strong> (hoặc chờ đồng nghiệp chọn bạn vào phòng của họ).
            </p>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#b45309',
              fontSize: '0.72rem',
              fontWeight: 600,
              marginBottom: 12
            }}>
              <Info size={14} style={{ flexShrink: 0 }} />
              <span>Ghi chú: Nếu bé &lt; 11 tuổi sẽ không tính vào số lượng người trong phòng (ngủ cùng người thân).</span>
            </div>

            {isLocked ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-danger)',
                fontWeight: 600,
                fontSize: '0.82rem'
              }}>
                <AlertCircle size={16} /> Hệ thống đã khóa đăng ký, vui lòng liên hệ Admin BTC để được hỗ trợ xếp phòng.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={handleOpenCreateModal}
                  className="btn btn-primary"
                  style={{ padding: '7px 16px', fontSize: '0.84rem', fontWeight: 700, boxShadow: '0 3px 12px rgba(37, 99, 235, 0.35)' }}
                >
                  <PlusCircle size={17} />
                  Tạo Phòng Mới Ngay
                </button>

                {onOpenAllRooms && (
                  <button
                    type="button"
                    onClick={onOpenAllRooms}
                    className="btn btn-secondary"
                    style={{ padding: '7px 14px', fontSize: '0.84rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Xem tất cả các phòng đã xếp và tra cứu thành viên"
                  >
                    <Search size={16} />
                    Tra Cứu Phòng ({allRooms.length})
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Case B & C: In a Room */
          <div>
            {/* Banner: Đã được người khác thêm vào phòng (Chỉ hiển thị khi chưa xác nhận) */}
            {!isLeader && !isRoomAcknowledged && (
              <div style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(6, 182, 212, 0.08))',
                border: '1.5px solid var(--primary-500)',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 260, flex: 1 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'var(--primary-gradient)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                  }}>
                    <Users size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.02rem', color: 'var(--text-main)', marginBottom: 2 }}>
                      Bạn đã được thêm vào phòng {myRoom.code} ({myRoom.capacity} Người)
                    </div>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                      Trưởng phòng <strong>{leaderPerson?.name || 'Đồng nghiệp'}</strong> ({leaderPerson?.code}) đã chọn bạn vào phòng này. Bấm <strong>Xác nhận giữ phòng</strong> nếu đồng ý, hoặc dùng nút <strong>Rời khỏi phòng</strong> bên dưới nếu muốn lập phòng riêng.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleAcknowledgeRoom}
                    className="btn btn-primary btn-sm"
                    style={{
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                    }}
                    title="Xác nhận giữ nguyên phòng này và ẩn thông báo"
                  >
                    <CheckCircle size={16} /> Xác Nhận Giữ Phòng
                  </button>
                  <button
                    type="button"
                    onClick={handleAcknowledgeRoom}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '1rem',
                      lineHeight: 1
                    }}
                    title="Đóng thông báo"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Header of Room */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              paddingBottom: 16,
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: 20
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                    {myRoom.code}
                  </h3>
                  <span className={`badge ${myRoom.status === 'FULL' ? 'badge-success' : 'badge-warning badge-blinking-urgent'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {myRoom.status === 'FULL' ? 'Đã đủ chỗ' : (
                      <>
                        <span className="dot-blinking-urgent" />
                        Thiếu {myRoom.capacity - myRoom.usedSlots} chỗ
                      </>
                    )}
                  </span>
                  <span className="badge badge-primary">
                    Phòng {myRoom.capacity} Người
                  </span>
                </div>

                {myRoom.status !== 'FULL' && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--color-danger)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    marginBottom: 4
                  }}>
                    <span className="dot-blinking-urgent" />
                    Phòng chưa đủ người theo định mức ({myRoom.usedSlots}/{myRoom.capacity} chỗ) - Đồng nghiệp khác có thể chọn vào ghép!
                  </div>
                )}

                <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Trưởng phòng: <strong>{leaderPerson ? leaderPerson.name : 'Chưa rõ'}</strong></span>
                  <span>•</span>
                  <span>Kiểu giường gợi ý: <strong>{myRoom.bedType}</strong></span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {onOpenAllRooms && (
                  <button
                    type="button"
                    onClick={onOpenAllRooms}
                    className="btn btn-outline btn-sm"
                    style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Tra cứu danh sách tất cả các phòng khác trong đoàn"
                  >
                    <Search size={14} /> Tra cứu các phòng ({allRooms.length})
                  </button>
                )}
                {isLeader ? (
                  <>
                    {!isLocked && (
                      <button
                        onClick={handleOpenEditModal}
                        className="btn btn-secondary btn-sm"
                      >
                        <Edit size={16} /> Sửa Phòng
                      </button>
                    )}
                    <button
                      onClick={handleConfirmDelete}
                      className="btn btn-danger btn-sm"
                    >
                      <Trash2 size={16} /> Hủy Phòng
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleConfirmLeave}
                    className="btn btn-danger btn-sm"
                  >
                    <LogOut size={16} /> Rời Khỏi Phòng
                  </button>
                )}
              </div>
            </div>

            {/* Room Members List */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Thành viên trong phòng ({roomMembers.length}/{myRoom.capacity} suất người lớn):</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {myRoom.childCount > 0 && `(Kèm ${myRoom.childCount} trẻ em ở ghép)`}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {roomMembers.map(m => {
                  const isRoomLeader = m.id === myRoom.leaderId || m.code === myRoom.leaderId;
                  const isSelf = m.id === currentEmployee.id || m.code === currentEmployee.code;
                  const canRemoveOther = !currentTrip.isLocked && !isSelf && (isLeader || m.ownerId === currentEmployee.code);
                  const canLeaveSelf = !currentTrip.isLocked && isSelf;

                  let relLabel = m.type === 'EMPLOYEE' ? 'Đồng nghiệp' : (m.relation || 'Người thân');
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
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelf ? 'rgba(37, 99, 235, 0.06)' : 'var(--bg-card-solid)',
                        border: isSelf ? '1.5px solid var(--primary-500)' : '1px solid var(--border-subtle)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{m.name}</span>
                          {isSelf && (
                            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Bạn</span>
                          )}
                          {isRoomLeader && (
                            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                              <Crown size={10} /> Trưởng phòng
                            </span>
                          )}
                        </div>

                        <span className={`badge ${m.gender === 'M' ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                          {m.gender === 'M' ? 'Nam' : 'Nữ'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{relLabel}</span>
                        <span>•</span>
                        <span>{m.slot === 0 ? '0 suất (ở ghép)' : '1 suất'}</span>
                        <span>•</span>
                        <span>{m.code}</span>
                      </div>

                      <div style={{
                        fontSize: '0.76rem',
                        color: 'var(--text-dim)',
                        marginTop: 8,
                        paddingTop: 6,
                        borderTop: '1px dashed var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.store}>
                          <Building size={11} style={{ flexShrink: 0 }} /> {m.store}
                        </div>

                        {canLeaveSelf && (
                          <button
                            type="button"
                            onClick={isLeader ? handleConfirmDelete : handleConfirmLeave}
                            className="btn btn-sm"
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: 'var(--color-danger)',
                              cursor: 'pointer',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              flexShrink: 0,
                              transition: 'all 0.15s ease'
                            }}
                            title={isLeader ? 'Hủy / Giải tán phòng này' : 'Xóa tên ra khỏi danh sách phòng'}
                          >
                            {isLeader ? <Trash2 size={12} /> : <LogOut size={12} />}
                            <span>{isLeader ? 'Hủy phòng' : 'Xóa khỏi phòng'}</span>
                          </button>
                        )}

                        {canRemoveOther && (
                          <button
                            type="button"
                            onClick={() => setRemovingMember(m)}
                            className="btn btn-sm"
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: 'var(--color-danger)',
                              cursor: 'pointer',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              flexShrink: 0,
                              transition: 'all 0.15s ease'
                            }}
                            title={`Xóa ${m.name} khỏi phòng`}
                          >
                            <Trash2 size={12} />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. My Family Relatives Section */}
      <div className="glass-card" style={{ padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Heart size={16} style={{ color: 'var(--color-danger)' }} />
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>
            Người Thân Của Tôi ({myRelatives.length})
          </h4>
        </div>

        {myRelatives.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            Bạn chưa đăng ký người thân nào đi cùng chuyến du lịch này.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 6 }}>
            {myRelatives.map(rel => {
              const relRoom = allRooms.find(r => r.id === rel.roomId);

              return (
                <div
                  key={rel.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border-subtle)',
                    gap: 8,
                    whiteSpace: 'nowrap',
                    minHeight: 36
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    minWidth: 0,
                    flex: 1,
                    overflow: 'hidden'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }} title={rel.name}>
                      {rel.name}
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '1px 5px', lineHeight: 1.25 }}>
                      {rel.relation === 'SPOUSE' ? 'Vợ/Chồng' : (rel.relation || 'Người thân')}
                    </span>
                    <span className="badge badge-gray" style={{ fontSize: '0.68rem', padding: '1px 5px', lineHeight: 1.25 }}>
                      {rel.slot === 0 ? '0s' : '1s'}
                    </span>
                    {relRoom ? (
                      <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                        Ở {relRoom.code}
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                        Chưa phòng
                      </span>
                    )}
                  </div>

                  {onUnclaimRelative && (
                    <button
                      type="button"
                      onClick={() => setUnclaimingRelative(rel)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: 'var(--color-danger)',
                        cursor: 'pointer',
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.72rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontWeight: 600,
                        flexShrink: 0
                      }}
                      title="Hủy nhận người thân này"
                    >
                      <Trash2 size={11} />
                      Hủy
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Room Modal */}
      {isModalOpen && (
        <RoomModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaveRoom={(cap, memberIds) => onSaveRoom(cap, memberIds, isEditing && myRoom ? myRoom.id : undefined)}
          currentEmployee={currentEmployee}
          allPeople={allPeople}
          editingRoom={isEditing ? myRoom : null}
          maxChildrenPerRoom={currentTrip.maxChildrenPerRoom}
          currentTrip={currentTrip}
          allRooms={allRooms}
          onJoinRoom={(roomId, personId) => {
            setIsModalOpen(false);
            if (onJoinRoom) {
              onJoinRoom(roomId, personId);
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && myRoom && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
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
              Xác Nhận Hủy Phòng {myRoom.code}?
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Bạn có chắc chắn muốn giải tán phòng <strong>{myRoom.code}</strong> không? Tất cả các thành viên trong phòng sẽ trở về trạng thái <strong>Chưa có phòng</strong> để có thể đăng ký lại.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowDeleteModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1.3 }}
                onClick={executeDelete}
              >
                Xác Nhận Hủy Phòng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveModal && myRoom && (
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.1)',
              color: 'var(--color-warning)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <LogOut size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>
              Xác Nhận Rời Phòng {myRoom.code}?
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Bạn sẽ rời khỏi phòng này và trở về trạng thái <strong>Chưa có phòng</strong>. Bạn có thể tự tạo phòng mới hoặc ghép với đồng nghiệp khác.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowLeaveModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-warning"
                style={{ flex: 1.3 }}
                onClick={executeLeave}
              >
                Xác Nhận Rời Phòng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xác Nhận Hủy Nhận Người Thân */}
      {unclaimingRelative && (
        <div className="modal-overlay" onClick={() => setUnclaimingRelative(null)} style={{ zIndex: 1200 }}>
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
              Xác Nhận Hủy Nhận Người Thân?
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Bạn có chắc chắn muốn hủy nhận người thân <strong>"{unclaimingRelative.name}"</strong> không?
              {unclaimingRelative.roomId ? ' Người thân cũng sẽ được đưa ra khỏi phòng hiện tại.' : ''} Sau khi hủy, người thân sẽ trở về danh sách chung và có thể được nhận lại.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setUnclaimingRelative(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1.3 }}
                onClick={() => {
                  if (onUnclaimRelative && unclaimingRelative) {
                    onUnclaimRelative(unclaimingRelative.id);
                  }
                  setUnclaimingRelative(null);
                }}
              >
                <Trash2 size={16} />
                Xác Nhận Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xác Nhận Xóa Thành Viên Khỏi Phòng Trực Tiếp */}
      {removingMember && (
        <div className="modal-overlay" onClick={() => setRemovingMember(null)} style={{ zIndex: 1200 }}>
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
              Xóa Khỏi Phòng?
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Bạn có chắc chắn muốn xóa <strong>"{removingMember.name}"</strong> ra khỏi phòng <strong>{myRoom?.code}</strong> không?
              Thành viên này sẽ được đưa ra khỏi phòng và có thể ghép vào phòng khác sau.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setRemovingMember(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1.3 }}
                onClick={() => {
                  onLeaveRoom(removingMember.id);
                  setRemovingMember(null);
                }}
              >
                <Trash2 size={16} />
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
