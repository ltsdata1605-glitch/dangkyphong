import React, { useMemo } from 'react';
import { Person } from '../types';
import { HeartHandshake, CheckCircle2, UserPlus, Info } from 'lucide-react';

interface EmployeeRelativeClaimProps {
  currentEmployee: Person;
  allPeople: Person[];
  onClaimRelative: (relativeId: string) => void;
}

export const EmployeeRelativeClaim: React.FC<EmployeeRelativeClaimProps> = ({
  currentEmployee,
  allPeople,
  onClaimRelative
}) => {
  // Tìm những người thân cùng siêu thị nhưng chưa có nhân viên bảo trợ (ownerId === null) và không phải PG
  const unclaimedRelativesInStore = useMemo(() => {
    return allPeople.filter(p =>
      p.type === 'RELATIVE' &&
      p.store === currentEmployee.store &&
      (!p.ownerId || p.ownerId === '')
    );
  }, [allPeople, currentEmployee.store]);

  if (unclaimedRelativesInStore.length === 0) {
    return null;
  }

  return (
    <div style={{
      marginBottom: 20,
      padding: '16px 20px',
      borderRadius: 'var(--radius-lg)',
      background: 'rgba(245, 158, 11, 0.08)',
      border: '1px solid rgba(245, 158, 11, 0.25)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <HeartHandshake size={22} style={{ color: 'var(--color-warning)' }} />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
          Xác Nhận Người Thân Đi Kèm Của Bạn
        </h3>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
        Tại <strong>{currentEmployee.store}</strong> hiện có <strong>{unclaimedRelativesInStore.length}</strong> người thân đăng ký chưa gắn mã nhân viên. Nếu là người thân của bạn, hãy bấm xác nhận để được xếp chung phòng gia đình:
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {unclaimedRelativesInStore.map(rel => {
          let relLabel = 'Người thân';
          if (rel.relation === 'SPOUSE') relLabel = 'Vợ / Chồng';
          else if (rel.relation === 'PARENT') relLabel = 'Ba / Mẹ';
          else if (rel.relation === 'CHILD_U5') relLabel = 'Con (<5 tuổi)';
          else if (rel.relation === 'CHILD_5_11') relLabel = 'Con (5-11 tuổi)';
          else if (rel.relation === 'CHILD_12P') relLabel = 'Con (>=12 tuổi)';

          return (
            <div
              key={rel.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card-solid)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                  {rel.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                    {relLabel}
                  </span>
                  <span className="badge badge-gray" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                    {rel.slot === 0 ? '0 suất (ở ghép)' : '1 suất'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onClaimRelative(rel.id)}
                className="btn btn-sm btn-primary"
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                title="Xác nhận đây là người thân của tôi"
              >
                <UserPlus size={14} />
                Nhận
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
