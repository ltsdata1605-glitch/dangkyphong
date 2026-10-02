import React, { useState, useMemo } from 'react';
import { Person } from '../types';
import { removeVietnameseTones } from '../utils/textUtils';
import { Search, UserCheck, ShieldAlert, Sparkles, Building, ArrowRight } from 'lucide-react';

interface EmployeeLoginProps {
  people: Person[];
  onLogin: (employee: Person) => void;
}

export const EmployeeLogin: React.FC<EmployeeLoginProps> = ({ people, onLogin }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
    setConfirmCode('');
    setErrorMsg('');
  };

  const handleConfirmLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;

    if (confirmCode.trim() !== selectedPerson.code.trim()) {
      setErrorMsg(`Mã nhân viên xác nhận không chính xác. Vui lòng nhập đúng MSNV của "${selectedPerson.name}".`);
      return;
    }

    onLogin(selectedPerson);
  };

  return (
    <div style={{ maxWidth: 520, margin: '30px auto', padding: '0 16px' }}>
      <div className="glass-card" style={{ padding: '28px 24px', boxShadow: 'var(--shadow-xl)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
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
            <UserCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Đăng Nhập Nhân Viên</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
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
                      <ArrowRight size={16} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
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
          /* Step 2: Confirm with MSNV */
          <form onSubmit={handleConfirmLogin}>
            <div style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              marginBottom: 16
            }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--primary-600)', textTransform: 'uppercase', fontWeight: 700 }}>
                Bạn đã chọn:
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                {selectedPerson.name}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {selectedPerson.store}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: 6 }}>
                Xác thực danh tính – Nhập lại MSNV của bạn:
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Nhập mã nhân viên để xác thực..."
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                autoFocus
              />
            </div>

            {errorMsg && (
              <div style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: 'var(--color-danger)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

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
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1.5 }}
              >
                Vào Đăng Ký Phòng
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
