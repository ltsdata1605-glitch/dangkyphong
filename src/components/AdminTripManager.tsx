import React, { useState } from 'react';
import { Trip } from '../types';
import {
  Calendar,
  Building,
  MapPin,
  Clock,
  Plus,
  Trash2,
  Edit,
  RotateCcw,
  Baby,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface AdminTripManagerProps {
  currentTrip: Trip;
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onSaveTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  onResetData: (tripId: string) => void;
}

export const AdminTripManager: React.FC<AdminTripManagerProps> = ({
  currentTrip,
  trips,
  onSelectTrip,
  onSaveTrip,
  onDeleteTrip,
  onResetData
}) => {
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState<Partial<Trip>>({});

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingTrip(null);
    setFormData({
      id: `trip_${Date.now()}`,
      name: '',
      hotelName: '',
      location: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16),
      isLocked: false,
      maxChildrenPerRoom: 2,
      roomLimits: {
        2: 152,
        3: 11,
        4: 20,
        5: 6,
        6: 6
      },
      createdAt: new Date().toISOString()
    });
  };

  const handleStartEdit = (t: Trip) => {
    setEditingTrip(t);
    setIsCreating(false);
    setFormData({
      ...t,
      deadline: t.deadline.slice(0, 16),
      roomLimits: t.roomLimits || { 2: 152, 3: 11, 4: 20, 5: 6, 6: 6 }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Vui lòng nhập tên chuyến đi.');
      return;
    }

    const tripToSave: Trip = {
      ...(formData as Trip),
      deadline: new Date(formData.deadline || '').toISOString()
    };

    onSaveTrip(tripToSave);
    setEditingTrip(null);
    setIsCreating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
            Quản Lý Các Chuyến Đi & Khách Sạn (Multi-trip)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Hệ thống hỗ trợ quản lý nhiều chuyến đi/đợt du lịch độc lập, mỗi chuyến đi có danh sách và phòng riêng
          </p>
        </div>

        <button onClick={handleStartCreate} className="btn btn-primary">
          <Plus size={16} /> Thêm Chuyến Đi Mới
        </button>
      </div>

      {/* Trips Cards List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {trips.map(trip => {
          const isActive = trip.id === currentTrip.id;

          return (
            <div
              key={trip.id}
              className="glass-card"
              style={{
                padding: '20px',
                border: isActive ? '2px solid var(--primary-500)' : '1px solid var(--border-subtle)',
                position: 'relative'
              }}
            >
              {isActive && (
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <span className="badge badge-primary">Đang quản lý</span>
                </div>
              )}

              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 8, paddingRight: 60 }}>
                {trip.name}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building size={14} style={{ color: 'var(--primary-500)' }} />
                  <span>{trip.hotelName || 'Chưa cập nhật khách sạn'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} style={{ color: 'var(--color-danger)' }} />
                  <span>{trip.location || 'Chưa cập nhật địa điểm'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} style={{ color: 'var(--color-warning)' }} />
                  <span>{trip.startDate} - {trip.endDate}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} style={{ color: 'var(--color-info)' }} />
                  <span>Hạn chót: {new Date(trip.deadline).toLocaleString('vi-VN')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Baby size={14} style={{ color: 'var(--color-success)' }} />
                  <span>Tối đa {trip.maxChildrenPerRoom || 2} trẻ em/phòng</span>
                </div>

                {/* Định mức số lượng phòng theo loại */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 6,
                  padding: '8px 10px',
                  background: 'var(--bg-muted)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem'
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Định mức:</span>
                  {[2, 3, 4, 5, 6].map(cap => (
                    <span
                      key={cap}
                      style={{
                        background: 'var(--bg-card-solid)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      P.{cap}: <strong>{trip.roomLimits?.[cap] ?? '—'}p</strong>
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                {!isActive && (
                  <button
                    onClick={() => onSelectTrip(trip.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    Chọn làm việc
                  </button>
                )}

                <button
                  onClick={() => handleStartEdit(trip)}
                  className="btn btn-secondary btn-sm"
                >
                  <Edit size={14} /> Sửa
                </button>

                <button
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn xóa chuyến đi "${trip.name}"? Dữ liệu nhân sự và phòng của chuyến này sẽ bị xóa.`)) {
                      onDeleteTrip(trip.id);
                    }
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--color-danger)' }}
                >
                  <Trash2 size={14} /> Xóa
                </button>

                {isActive && (
                  <button
                    onClick={() => {
                      if (window.confirm('Đặt lại toàn bộ dữ liệu phòng của chuyến này về ban đầu (550 người)?')) {
                        onResetData(trip.id);
                      }
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--color-warning)', marginLeft: 'auto' }}
                    title="Đặt lại dữ liệu phòng về ban đầu"
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Thêm / Sửa Chuyến Đi */}
      {(isCreating || editingTrip) && (
        <div className="modal-overlay" onClick={() => { setIsCreating(false); setEditingTrip(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                {isCreating ? 'Tạo Chuyến Đi Mới' : 'Chỉnh Sửa Thông Tin Chuyến Đi'}
              </h3>
              <button onClick={() => { setIsCreating(false); setEditingTrip(null); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                  Tên Chuyến Đi / Đoàn Du Lịch:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ví dụ: Đoàn Du Lịch Phú Quốc - Đợt 1 (10/2026)"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                    Tên Khách Sạn / Resort:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ví dụ: Vinpearl Resort..."
                    value={formData.hotelName || ''}
                    onChange={e => setFormData({ ...formData, hotelName: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                    Địa Điểm:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ví dụ: Bãi Dài, Phú Quốc..."
                    value={formData.location || ''}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                    Ngày Bắt Đầu:
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.startDate || ''}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                    Ngày Kết Thúc:
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.endDate || ''}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                    Hạn Chót Đăng Ký (Ngày & Giờ):
                  </label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={formData.deadline || ''}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                    Trẻ em tối đa / phòng:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className="input-field"
                    value={formData.maxChildrenPerRoom || 2}
                    onChange={e => setFormData({ ...formData, maxChildrenPerRoom: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Định mức số lượng tối đa từng loại phòng (Hình 2) */}
              <div style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-muted)',
                border: '1px solid var(--border-subtle)'
              }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: 4, color: 'var(--text-main)' }}>
                  Giới Hạn Số Lượng Phòng Tối Đa (Theo Loại Phòng):
                </label>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                  Hệ thống sẽ tự động khóa và hiển thị màu xám cảnh báo khi số phòng đăng ký đạt số lượng tối đa này.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {[2, 3, 4, 5, 6].map(cap => (
                    <div key={cap} style={{ textAlign: 'center' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: 4 }}>
                        {cap} Người
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="input-field"
                        style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 700, fontSize: '0.9rem' }}
                        value={formData.roomLimits?.[cap] ?? (cap === 2 ? 152 : cap === 3 ? 11 : cap === 4 ? 20 : 6)}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setFormData({
                            ...formData,
                            roomLimits: {
                              ...(formData.roomLimits || { 2: 152, 3: 11, 4: 20, 5: 6, 6: 6 }),
                              [cap]: isNaN(val) ? 0 : val
                            }
                          });
                        }}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setIsCreating(false); setEditingTrip(null); }}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu Chuyến Đi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
