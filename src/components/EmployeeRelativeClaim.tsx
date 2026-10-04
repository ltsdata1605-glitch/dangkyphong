import React, { useState, useMemo } from 'react';
import { Person, RelationType, PersonType } from '../types';
import { HeartHandshake, UserPlus, Search, Building2, Info, X, Check, Baby, Users, AlertTriangle } from 'lucide-react';
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

  // Modal chọn mối quan hệ khi thêm
  const [claimingRelative, setClaimingRelative] = useState<Person | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<RelationType>('SPOUSE');
  const [isCommitted, setIsCommitted] = useState(false);

  // Kết quả tìm kiếm người thân ở siêu thị khác
  const searchedOtherRelatives = useMemo(() => {
    const clean = removeVietnameseTones(searchOtherStore).trim().toLowerCase();
    if (!clean) return [];

    return allPeople.filter(p => {
      // 1. Không tìm chính mình
      if (p.id === currentEmployee.id || p.code === currentEmployee.code) return false;

      // 2. Không tìm người đã được nhân viên khác nhận
      if (p.ownerId && p.ownerId !== '' && p.ownerId !== currentEmployee.code) return false;

      const matchName = removeVietnameseTones(p.name).toLowerCase().includes(clean);
      const matchStore = removeVietnameseTones(p.store).toLowerCase().includes(clean);
      const matchCode = p.code.toLowerCase().includes(clean);
      const matchPhone = p.phone ? p.phone.toLowerCase().includes(clean) : false;

      return matchName || matchStore || matchCode || matchPhone;
    });
  }, [allPeople, searchOtherStore, currentEmployee.id, currentEmployee.code]);

  const handleOpenClaimModal = (rel: Person) => {
    setClaimingRelative(rel);
    setIsCommitted(false);
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

  const getRelationBadge = (relation: RelationType | null, _slot?: number, type?: PersonType) => {
    let label = type === 'EMPLOYEE' ? 'Nhân viên' : 'Người thân';

    if (relation === 'SPOUSE') label = 'Vợ / Chồng';
    else if (relation === 'PARENT') label = 'Ba / Mẹ';
    else if (relation === 'CHILD_U5') label = 'Con < 5 tuổi';
    else if (relation === 'CHILD_5_11') label = 'Con 5–11 tuổi';
    else if (relation === 'CHILD_12P') label = 'Con ≥ 12 tuổi';

    return (
      <span className={`badge ${type === 'EMPLOYEE' ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.66rem', padding: '1px 5px', lineHeight: 1.25, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {label}
      </span>
    );
  };

  // Nếu không có người thân trong siêu thị và chưa bật tìm kiếm khác, vẫn hiển thị thanh tìm kiếm gọn gàng
  const hasStoreRelatives = unclaimedRelativesInStore.length > 0;

  return (
    <div style={{
      marginBottom: 12,
      padding: '12px 14px',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(245, 158, 11, 0.08)',
      border: '1px solid rgba(245, 158, 11, 0.28)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'nowrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          <HeartHandshake size={17} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <h3 className="relative-claim-title" style={{ fontSize: '0.86rem', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Xác Nhận Người Thân Đi Kèm
          </h3>
        </div>

        {/* Dòng nhập tìm thông tin người thân trực tiếp - Ô tìm kiếm nhỏ gọn cùng hàng theo yêu cầu */}
        <div className="relative-search-box" style={{ position: 'relative', width: 175, minWidth: 120, flexShrink: 0 }}>
          <Search size={12} style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field relative-search-input"
            placeholder="Tìm ở siêu thị khác..."
            value={searchOtherStore}
            onChange={e => setSearchOtherStore(e.target.value)}
          />
          {searchOtherStore && (
            <button
              type="button"
              onClick={() => setSearchOtherStore('')}
              style={{
                position: 'absolute',
                right: 5,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center'
              }}
              title="Xóa tìm kiếm"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Kết quả tìm kiếm người thân ở siêu thị khác (HIỂN THỊ KHI NGƯỜI DÙNG NHẬP VÀO Ô TÌM KIẾM) */}
      {searchOtherStore.trim() && (
        <div style={{
          marginBottom: 10,
          padding: '8px 10px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-card-solid)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#b45309', fontSize: '0.78rem', fontWeight: 700 }}>
              <Building2 size={14} />
              <span>Kết quả tìm người thân ở siêu thị khác ({searchedOtherRelatives.length}):</span>
            </div>
            <button
              type="button"
              onClick={() => setSearchOtherStore('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                fontSize: '0.72rem'
              }}
            >
              <X size={12} /> Đóng
            </button>
          </div>

          {searchedOtherRelatives.length === 0 ? (
            <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
              Không tìm thấy người thân nào khớp với từ khóa "{searchOtherStore}". Vui lòng kiểm tra lại họ tên, MSNV hoặc tên siêu thị.
            </div>
          ) : (
            <div className="relative-claim-grid-3">
              {searchedOtherRelatives.map(rel => (
                <div
                  key={rel.id}
                  className="relative-claim-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border-subtle)',
                    gap: 4,
                    minHeight: 32,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, overflow: 'hidden', lineHeight: 1.2 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rel.name}>
                      {rel.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                      {getRelationBadge(rel.relation, rel.slot, rel.type)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenClaimModal(rel)}
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: '0.68rem', padding: '2px 6px', height: 22, flexShrink: 0, borderRadius: 'var(--radius-sm)', gap: 2, fontWeight: 700 }}
                    title={`Nhận ${rel.name} (${rel.store})`}
                  >
                    <UserPlus size={10} />
                    Nhận
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {hasStoreRelatives ? (
        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
          Tại <strong>{currentEmployee.store}</strong> hiện có <strong>{unclaimedRelativesInStore.length}</strong> người thân đăng ký chưa gắn mã nhân viên. Nếu là người thân của bạn, hãy bấm xác nhận để được xếp chung phòng gia đình:
        </p>
      ) : (
        !searchOtherStore.trim() && (
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
            Hiện không có người thân nào chưa gắn mã tại <strong>{currentEmployee.store}</strong>. Nếu người thân của bạn đăng ký ở siêu thị/đơn vị khác, hãy nhập tên vào ô tìm kiếm ở góc trên để tìm và nhận người thân:
          </p>
        )
      )}

      {/* 2. Danh sách người thân cùng siêu thị (GRID 3 CỘT) */}
      {hasStoreRelatives && (
        <div className="relative-claim-grid-3">
          {unclaimedRelativesInStore.map(rel => (
            <div
              key={rel.id}
              className="relative-claim-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 6px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-card-solid)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                gap: 4,
                minHeight: 32,
                overflow: 'hidden'
              }}
            >
              {/* Tên + Badge quan hệ */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                flex: 1,
                overflow: 'hidden',
                lineHeight: 1.2
              }}>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--text-main)'
                  }}
                  title={rel.name}
                >
                  {rel.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                  {getRelationBadge(rel.relation, rel.slot, rel.type)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenClaimModal(rel)}
                className="btn btn-sm btn-primary"
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  height: 22,
                  flexShrink: 0,
                  borderRadius: 'var(--radius-sm)',
                  gap: 2,
                  fontWeight: 700
                }}
                title="Xác nhận đây là người thân của tôi"
              >
                <UserPlus size={10} />
                Nhận
              </button>
            </div>
          ))}
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

            {/* Cảnh báo răn đe quy định nam nữ ở cùng phòng / quan hệ vợ chồng */}
            {(() => {
              const isOppositeGender = Boolean(
                claimingRelative &&
                claimingRelative.gender &&
                currentEmployee.gender &&
                claimingRelative.gender !== currentEmployee.gender
              );
              const isSpouseRelation = selectedRelation === 'SPOUSE';
              const showDeterrentWarning = isOppositeGender || isSpouseRelation;

              if (!showDeterrentWarning) return null;

              return (
                <div style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1.5px solid rgba(239, 68, 68, 0.35)',
                  marginBottom: 16
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--color-danger)',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    marginBottom: 8
                  }}>
                    <AlertTriangle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                    <span>CẢNH BÁO QUY ĐỊNH CÔNG TY (NGHIÊM CẤM GIAN LẬN)</span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.55 }}>
                    <p style={{ margin: '0 0 6px 0' }}>
                      ⚖️ Công ty <strong>nghiêm cấm Nam và Nữ ở cùng phòng</strong> nếu không phải là <strong>Vợ / Chồng hợp pháp</strong> hoặc <strong>người thân ruột thịt</strong>.
                    </p>
                    <p style={{ margin: 0, color: 'var(--color-danger)', fontWeight: 600 }}>
                      ⚠️ Khi xác nhận, bạn <strong>hoàn toàn chịu trách nhiệm kỷ luật</strong> trước Công ty nếu khai báo không trung thực nhằm mục đích ghép phòng trái quy định.
                    </p>
                  </div>

                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px dashed rgba(239, 68, 68, 0.35)',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={isCommitted}
                      onChange={e => setIsCommitted(e.target.checked)}
                      style={{
                        width: 17,
                        height: 17,
                        marginTop: 2,
                        cursor: 'pointer',
                        accentColor: 'var(--color-danger)'
                      }}
                    />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-danger)', lineHeight: 1.4 }}>
                      Tôi cam kết thông tin quan hệ trên là đúng sự thật và chịu hoàn toàn trách nhiệm kỷ luật nếu không trung thực.
                    </span>
                  </label>
                </div>
              );
            })()}

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
                <div style={{ marginTop: 4 }}>👶 <strong>Trẻ em:</strong> Riêng đối với bé &lt; 12 tuổi (dưới 5 tuổi hoặc 5–11 tuổi) sẽ ở cùng phòng người thân và <strong>không tính là 1 người</strong> (0 suất người lớn).</div>
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
              {(() => {
                const isOppositeGender = Boolean(
                  claimingRelative &&
                  claimingRelative.gender &&
                  currentEmployee.gender &&
                  claimingRelative.gender !== currentEmployee.gender
                );
                const isSpouseRelation = selectedRelation === 'SPOUSE';
                const showDeterrentWarning = isOppositeGender || isSpouseRelation;
                const isDisabled = showDeterrentWarning && !isCommitted;

                return (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmClaim}
                    disabled={isDisabled}
                    style={{
                      opacity: isDisabled ? 0.5 : 1,
                      cursor: isDisabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Check size={16} />
                    Xác Nhận Nhận Người Thân
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
