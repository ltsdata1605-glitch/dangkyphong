import React, { useState, useMemo } from 'react';
import { Person } from '../types';
import { removeVietnameseTones } from '../utils/textUtils';
import { Search, UserCheck, Sparkles, Building, ArrowRight } from 'lucide-react';

interface EmployeeLoginProps {
  people: Person[];
  onLogin: (employee: Person) => void;
}

export const EmployeeLogin: React.FC<EmployeeLoginProps> = ({ people, onLogin }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // Lọc chỉ lấy NHÂN VIÊN
  const employees = useMemo(() => {
    return people.filter(p => p.type === 'EMPLOYEE');
  }, [people]);

  // Tìm kiếm theo tên không dấu hoặc mã nhân viên
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const cleanSearch = removeVietnameseTones(searchTerm);

    return employees.filter(emp => {
      const matchName = removeVietnameseTones(emp.name).includes(cleanSearch);
      const matchCode = emp.code.toLowerCase().includes(cleanSearch);
      return matchName || matchCode;
    }).slice(0, 10); // Giới hạn 10 kết quả hiển thị cho gọn màn hình điện thoại
  }, [searchTerm, employees]);

  const handleSelect = (emp: Person) => {
    setSelectedPerson(emp);
  };

  return (
    <div className="employee-login-wrapper" style={{ maxWidth: 520, margin: '30px auto', padding: '0 16px' }}>
      <div className="glass-card employee-login-card" style={{ padding: '28px 24px', boxShadow: 'var(--shadow-xl)' }}>
        {/* Header */}
        <div className="employee-login-header" style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="employee-login-avatar" style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--primary-gradient)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: 12,
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
          }}>
            <UserCheck size={26} />
          </div>
          <h2 className="employee-login-title" style={{ fontSize: '1.4rem', fontWeight: 800 }}>Đăng Nhập Nhân Viên</h2>
          <p className="employee-login-desc" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Tìm tên của bạn để tự đăng ký và sắp xếp phòng khách sạn
          </p>
        </div>

        {/* Step 1: Select Employee */}
        {!selectedPerson ? (
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: 6 }}>
              Nhập Họ tên (không dấu hoặc có dấu) hoặc Mã số NV:
            </label>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Ví dụ: nguyen van vu hoặc 20894..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 42 }}
                autoFocus
              />
            </div>

            {/* Results List */}
            {searchTerm.trim().length > 0 && (
              <div style={{
                marginTop: 8,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                background: 'var(--bg-card-solid)'
              }}>
                {filteredEmployees.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Không tìm thấy nhân viên nào phù hợp với "{searchTerm}"
                  </div>
                ) : (
                  filteredEmployees.map(emp => (
                    <div
                      key={emp.id}
                      onClick={() => handleSelect(emp)}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                          {emp.name}
                          <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: '0.7rem' }}>
                            MSNV: {emp.code}
                          </span>
                          <span className={`badge ${emp.gender === 'M' ? 'badge-primary' : 'badge-warning'}`} style={{ marginLeft: 4, fontSize: '0.7rem' }}>
                            {emp.gender === 'M' ? 'Nam' : 'Nữ'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building size={12} /> {emp.store}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLogin(emp);
                          }}
                          style={{ fontWeight: 700, fontSize: '0.8rem', padding: '6px 12px' }}
                          title="Đăng nhập ngay"
                        >
                          Vào ngay <ArrowRight size={14} style={{ marginLeft: 4 }} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Hint Box */}
            <div style={{
              marginTop: 18,
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-muted)',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8
            }}>
              <Sparkles size={16} style={{ color: 'var(--primary-500)', flexShrink: 0, marginTop: 2 }} />
              <div>
                Hệ thống hỗ trợ gõ tìm kiếm tiếng Việt không dấu (vd: <i>tran van ngoan</i>) hoặc gõ trực tiếp 5-6 chữ số mã nhân viên.
              </div>
            </div>
          </div>
        ) : (
          /* Step 2: Confirm Employee & Enter (No 2nd auth verification needed) */
          <div>
            <div style={{
              padding: '16px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              marginBottom: 20
            }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--primary-600)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Bạn đã chọn:
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                {selectedPerson.name}
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building size={14} /> {selectedPerson.store}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <span className="badge badge-primary">MSNV: {selectedPerson.code}</span>
                <span className={`badge ${selectedPerson.gender === 'M' ? 'badge-primary' : 'badge-warning'}`}>
                  {selectedPerson.gender === 'M' ? 'Nam' : 'Nữ'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setSelectedPerson(null)}
              >
                Chọn lại tên
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1.5, fontWeight: 700 }}
                onClick={() => onLogin(selectedPerson)}
                autoFocus
              >
                Vào Đăng Ký Phòng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
