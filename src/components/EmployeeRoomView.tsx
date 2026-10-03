import React, { useState } from 'react';
import { Person, Room, Trip, RelationType } from '../types';
import { EmployeeRelativeClaim } from './EmployeeRelativeClaim';
import { RoomingProcessGuide } from './RoomingProcessGuide';
import { RoomModal } from './RoomModal';
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
  onOpenAllRooms
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Tìm phòng hiện tại của nhân viên
  const myRoom = allRooms.find(r => r.id === currentEmployee.roomId);
  const isLeader = myRoom && myRoom.leaderId === currentEmployee.id;

  // Thành viên trong phòng hiện tại
  const roomMembers = myRoom
    ? myRoom.memberIds.map(id => allPeople.find(p => p.id === id)!).filter(Boolean)
    : [];

  const leaderPerson = myRoom
    ? allPeople.find(p => p.id === myRoom.leaderId)
    : null;

  // Người thân thuộc quyền bảo trợ của nhân viên này
  const myRelatives = allPeople.filter(p => p.type === 'RELATIVE' && p.ownerId === currentEmployee.code);

  const isLocked = currentTrip.isLocked;

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

      {/* 2. Room Status Section */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: 24, boxShadow: 'var(--shadow-lg)' }}>
        {!myRoom ? (
          /* Case A: Not in any room */
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(37, 99, 235, 0.1)',
              color: 'var(--primary-500)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Bed size={32} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 8 }}>
              Bạn Chưa Có Phòng Khách Sạn
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: 520, margin: '0 auto 16px auto', lineHeight: 1.5 }}>
              Thực hiện theo 3 bước: <strong>1. Chọn người thân</strong> (chọn mối quan hệ) → <strong>2. Tự động tạo phòng 2 người</strong> → <strong>3. Ghép thêm người ở cùng</strong> (hoặc chờ đồng nghiệp chọn bạn vào phòng của họ).
            </p>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#b45309',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: 20
            }}>
              <Info size={15} />
              <span>Ghi chú: Nếu bé &lt; 11 tuổi sẽ không tính vào số lượng người trong phòng (ngủ cùng người thân).</span>
            </div>

            {isLocked ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-danger)',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                <AlertCircle size={18} /> Hệ thống đã khóa đăng ký, vui lòng liên hệ Admin BTC để được hỗ trợ xếp phòng.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={handleOpenCreateModal}
                  className="btn btn-primary btn-lg"
                  style={{ boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)' }}
                >
                  <PlusCircle size={20} />
                  Tạo Phòng Mới Ngay
                </button>

                {onOpenAllRooms && (
                  <button
                    type="button"
                    onClick={onOpenAllRooms}
                    className="btn btn-secondary btn-lg"
                    style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    title="Xem tất cả các phòng đã xếp và tra cứu thành viên"
                  >
                    <Search size={19} />
                    Tra Cứu Phòng ({allRooms.length})
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Case B & C: In a Room */
          <div>
            {/* Banner: Đã được người khác thêm vào phòng (Lựa chọn Giữ nguyên hoặc Rời phòng) */}
            {!isLeader && (
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
                gap: 14
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
                      Trưởng phòng <strong>{leaderPerson?.name || 'Đồng nghiệp'}</strong> ({leaderPerson?.code}) đã chọn bạn vào phòng này. Bạn có thể chọn giữ nguyên hoặc rời phòng để tự lập phòng riêng.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Đã xác nhận: Bạn giữ nguyên vị trí trong phòng ${myRoom.code}. Chúc bạn và đồng nghiệp có chuyến đi vui vẻ!`);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{
                      borderColor: 'var(--color-success)',
                      color: 'var(--color-success)',
                      fontWeight: 700,
                      background: 'rgba(34, 197, 94, 0.08)'
                    }}
                  >
                    <CheckCircle size={16} /> Giữ Nguyên Phòng
                  </button>

                  {!isLocked && (
                    <button
                      type="button"
                      onClick={handleConfirmLeave}
                      className="btn btn-danger btn-sm"
                      style={{ fontWeight: 700 }}
                    >
                      <LogOut size={16} /> Rời Khỏi Phòng
                    </button>
                  )}
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
                  <span className={`badge ${myRoom.status === 'FULL' ? 'badge-success' : 'badge-warning'}`}>
                    {myRoom.status === 'FULL' ? 'Đã đủ chỗ' : `Thiếu ${myRoom.capacity - myRoom.usedSlots} chỗ`}
                  </span>
                  <span className="badge badge-primary">
                    Phòng {myRoom.capacity} Người
                  </span>
                </div>

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
                  const isRoomLeader = m.id === myRoom.leaderId;
                  const isSelf = m.id === currentEmployee.id;
                  const canRemove = !currentTrip.isLocked && !isSelf && (isLeader || m.ownerId === currentEmployee.code);

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

                        {canRemove && (
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
                            Xóa
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
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Heart size={20} style={{ color: 'var(--color-danger)' }} />
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
            Người Thân Của Tôi ({myRelatives.length})
          </h4>
        </div>

        {myRelatives.length === 0 ? (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
            Bạn chưa đăng ký người thân nào đi cùng chuyến du lịch này.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
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
