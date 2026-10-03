import React, { useState, useMemo } from 'react';
import { Person, RelationType } from '../types';
import { HeartHandshake, UserPlus, Search, Building2, Info, X, Check, Baby, Users } from 'lucide-react';
import { removeVietnameseTones } from '../utils/textUtils';

interface EmployeeRelativeClaimProps {
  currentEmployee: Person;
  allPeople: Person[];
  onClaimRelative: (relativeId: string, relation?: RelationType) => void;
}

export const EmployeeRelativeClaim: React.FC<EmployeeRelativeClaimProps> = ({
  currentEmployee,
  allPeople,
  onClaimRelative
}) => {
  // Người thân cùng siêu thị chưa có nhân viên bảo trợ
  const unclaimedRelativesInStore = useMemo(() => {
    return allPeople.filter(p =>
      p.type === 'RELATIVE' &&
      p.store === currentEmployee.store &&
      (!p.ownerId || p.ownerId === '')
    );
  }, [allPeople, currentEmployee.store]);

  // Tìm kiếm người thân ở siêu thị khác
  const [searchOtherStore, setSearchOtherStore] = useState('');
  const [showOtherStoreSearch, setShowOtherStoreSearch] = useState(false);

  // Modal chọn mối quan hệ khi thêm
  const [claimingRelative, setClaimingRelative] = useState<Person | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<RelationType>('SPOUSE');

  // Kết quả tìm kiếm người thân ở siêu thị khác
  const searchedOtherRelatives = useMemo(() => {
    const clean = removeVietnameseTones(searchOtherStore).trim();
    if (!clean) return [];

    return allPeople.filter(p => {
      // Chỉ tìm người thân chưa được nhận
      if (p.type !== 'RELATIVE') return false;
      if (p.ownerId && p.ownerId !== '') return false;

      // Không hiển thị người đã nằm trong danh sách cùng siêu thị bên trên để tránh trùng lặp
      if (p.store === currentEmployee.store) return false;

      const matchName = removeVietnameseTones(p.name).includes(clean);
      const matchStore = removeVietnameseTones(p.store).includes(clean);
      const matchCode = p.code.toLowerCase().includes(clean);
      const matchPhone = p.phone ? p.phone.toLowerCase().includes(clean) : false;

      return matchName || matchStore || matchCode || matchPhone;
    }).slice(0, 30);
  }, [allPeople, searchOtherStore, currentEmployee.store]);

  const handleOpenClaimModal = (rel: Person) => {
    setClaimingRelative(rel);
    // Ưu tiên quan hệ có sẵn hoặc mặc định
    if (rel.relation) {
      setSelectedRelation(rel.relation);
    } else {
      setSelectedRelation('SPOUSE');
    }
  };

  const handleConfirmClaim = () => {
    if (!claimingRelative) return;
    onClaimRelative(claimingRelative.id, selectedRelation);
    setClaimingRelative(null);
  };

  const getRelationBadge = (relation: RelationType | null, slot: number) => {
    let label = 'Người thân';
    let isChild = false;

    if (relation === 'SPOUSE') label = 'Vợ / Chồng';
    else if (relation === 'PARENT') label = 'Ba / Mẹ';
    else if (relation === 'CHILD_U5') { label = 'Con < 5 tuổi'; isChild = true; }
    else if (relation === 'CHILD_5_11') { label = 'Con 5–11 tuổi'; isChild = true; }
    else if (relation === 'CHILD_12P') label = 'Con ≥ 12 tuổi';

    return (
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
          {label}
        </span>
        <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
          {slot === 0 || isChild ? 'Ở ghép (0 suất)' : '1 suất'}
        </span>
      </div>
    );
  };

  // Nếu không có người thân trong siêu thị và chưa bật tìm kiếm khác, vẫn hiển thị thanh tìm kiếm gọn gàng
  const hasStoreRelatives = unclaimedRelativesInStore.length > 0;

  return (
    <div style={{
      marginBottom: 20,
      padding: '18px 22px',
      borderRadius: 'var(--radius-lg)',
      background: 'rgba(245, 158, 11, 0.08)',
      border: '1px solid rgba(245, 158, 11, 0.28)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HeartHandshake size={22} style={{ color: 'var(--color-warning)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
            Xác Nhận Người Thân Đi Kèm Của Bạn
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setShowOtherStoreSearch(!showOtherStoreSearch)}
          className="btn btn-sm btn-outline"
          style={{
            fontSize: '0.8rem',
            padding: '5px 12px',
            borderColor: 'rgba(245, 158, 11, 0.4)',
            color: '#b45309',
            background: showOtherStoreSearch ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card-solid)'
          }}
        >
          <Search size={14} />
          {showOtherStoreSearch ? 'Ẩn tìm siêu thị khác' : 'Tìm người thân ở siêu thị khác'}
        </button>
      </div>

      {/* Description */}
      {hasStoreRelatives ? (
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: 14 }}>
          Tại <strong>{currentEmployee.store}</strong> hiện có <strong>{unclaimedRelativesInStore.length}</strong> người thân đăng ký chưa gắn mã nhân viên. Nếu là người thân của bạn, hãy bấm xác nhận để được xếp chung phòng gia đình:
        </p>
      ) : (
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: 14 }}>
          Hiện không có người thân nào chưa gắn mã tại <strong>{currentEmployee.store}</strong>. Nếu người thân của bạn đăng ký ở siêu thị/đơn vị khác, hãy nhập tên bên dưới để tìm và nhận người thân:
        </p>
      )}

      {/* 1. Danh sách người thân cùng siêu thị */}
      {hasStoreRelatives && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
          gap: 12,
          marginBottom: showOtherStoreSearch || !hasStoreRelatives ? 16 : 0
        }}>
          {unclaimedRelativesInStore.map(rel => (
            <div
              key={rel.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card-solid)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                gap: 12
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.94rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {rel.name}
                </div>
                <div style={{ marginTop: 4 }}>
                  {getRelationBadge(rel.relation, rel.slot)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenClaimModal(rel)}
                className="btn btn-sm btn-primary"
                style={{ fontSize: '0.82rem', padding: '6px 14px', flexShrink: 0 }}
                title="Xác nhận đây là người thân của tôi"
              >
                <UserPlus size={14} />
                Nhận
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 2. Thanh tìm kiếm người thân ở siêu thị khác */}
      {(showOtherStoreSearch || !hasStoreRelatives) && (
        <div style={{
          marginTop: hasStoreRelatives ? 14 : 0,
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card-solid)',
          border: '1px solid rgba(245, 158, 11, 0.35)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#b45309' }}>
            <Building2 size={16} />
            <strong style={{ fontSize: '0.88rem' }}>
              Tìm Người Thân Đăng Ký Ở Siêu Thị / Đơn Vị Khác:
            </strong>
          </div>

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Nhập họ tên người thân, số điện thoại hoặc tên siêu thị khác để tìm kiếm..."
              value={searchOtherStore}
              onChange={e => setSearchOtherStore(e.target.value)}
              style={{ paddingLeft: 38, fontSize: '0.88rem', background: 'var(--bg-muted)' }}
              autoFocus={showOtherStoreSearch}
            />
            {searchOtherStore && (
              <button
                type="button"
                onClick={() => setSearchOtherStore('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 10,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Kết quả tìm kiếm siêu thị khác */}
          {searchOtherStore.trim() && (
            <div>
              {searchedOtherRelatives.length === 0 ? (
                <div style={{
                  padding: '14px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem'
                }}>
                  Không tìm thấy người thân nào khớp với từ khóa "{searchOtherStore}". Vui lòng kiểm tra lại họ tên hoặc siêu thị.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Tìm thấy {searchedOtherRelatives.length} người thân ở siêu thị khác:
                  </div>
                  {searchedOtherRelatives.map(rel => (
                    <div
                      key={rel.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-muted)',
                        border: '1px solid var(--border-subtle)',
                        gap: 12
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rel.name}</span>
                          {rel.phone && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ({rel.phone})
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          🏢 <strong>Siêu thị:</strong> {rel.store}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          {getRelationBadge(rel.relation, rel.slot)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenClaimModal(rel)}
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: '0.8rem', padding: '6px 12px', flexShrink: 0 }}
                      >
                        <UserPlus size={14} />
                        Nhận
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CHỌN MỐI QUAN HỆ KHI THÊM */}
      {claimingRelative && (
        <div className="modal-overlay" onClick={() => setClaimingRelative(null)} style={{ zIndex: 1200 }}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 480, width: '92%', padding: '24px' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: 'var(--color-warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <HeartHandshake size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                    Xác Nhận Người Thân
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Chọn mối quan hệ chính xác để tính suất phòng
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setClaimingRelative(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Person Info */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-muted)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 16
            }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {claimingRelative.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                🏢 Siêu thị đăng ký: <strong>{claimingRelative.store}</strong>
              </div>
            </div>

            {/* Step 1: Select Relation */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 8 }}>
                Chọn mối quan hệ với bạn:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {[
                  { value: 'SPOUSE' as RelationType, label: 'Vợ / Chồng', desc: '1 suất người lớn', icon: '💍' },
                  { value: 'CHILD_U5' as RelationType, label: 'Con < 5 tuổi', desc: 'Ở ghép (0 suất)', icon: '👶' },
                  { value: 'CHILD_5_11' as RelationType, label: 'Con 5–11 tuổi', desc: 'Ở ghép (0 suất)', icon: '🧒' },
                  { value: 'CHILD_12P' as RelationType, label: 'Con ≥ 12 tuổi', desc: '1 suất người lớn', icon: '🧑' },
                  { value: 'PARENT' as RelationType, label: 'Ba / Mẹ', desc: '1 suất người lớn', icon: '👴' },
                  { value: 'OTHER' as RelationType, label: 'Khác / Người thân', desc: '1 suất người lớn', icon: '👥' },
                ].map(opt => {
                  const isSelected = selectedRelation === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedRelation(opt.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected
                          ? '2px solid var(--primary-500)'
                          : '1px solid var(--border-subtle)',
                        background: isSelected
                          ? 'rgba(37, 99, 235, 0.08)'
                          : 'var(--bg-card-solid)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '0.85rem',
                          color: isSelected ? 'var(--primary-600)' : 'var(--text-main)'
                        }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: isSelected ? 'var(--primary-600)' : 'var(--text-muted)' }}>
                          {opt.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <Check size={16} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Note about Auto Room Creation & Child < 11 years old */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8
            }}>
              <Info size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.8rem', color: '#b45309', lineHeight: 1.5 }}>
                <div>✨ <strong>Tự động tạo phòng:</strong> Hệ thống sẽ <strong>tự động tạo phòng 2 người</strong> với người thân này (hoặc tự thêm vào phòng hiện tại nếu bạn đã có phòng).</div>
                <div style={{ marginTop: 4 }}>👶 <strong>Trẻ em:</strong> Riêng đối với bé &lt; 11 tuổi (dưới 5 tuổi hoặc 5–11 tuổi) sẽ ở cùng phòng người thân và <strong>không tính là 1 người</strong> (0 suất người lớn).</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setClaimingRelative(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmClaim}
              >
                <Check size={16} />
                Xác Nhận Nhận Người Thân
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
