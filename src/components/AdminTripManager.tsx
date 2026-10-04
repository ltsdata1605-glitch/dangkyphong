import React, { useState, useRef } from 'react';
import { Trip, Person, Room } from '../types';
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
  AlertCircle,
  Upload,
  Download,
  Users,
  FileSpreadsheet
} from 'lucide-react';
import { exportTemplatePersonnelExcel, parseUploadedExcel } from '../services/excelService';
import { getPeople, savePeople, getTripImportInfo, getRooms } from '../services/storageService';
import { ExcelImportModal } from './ExcelImportModal';

const formatImportTime = (isoString?: string) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
};

interface AdminTripManagerProps {
  currentTrip?: Trip | null;
  trips: Trip[];
  rooms?: Room[];
  onSelectTrip: (tripId: string) => void;
  onSaveTrip: (trip: Trip, initialPeople?: Person[]) => void;
  onDeleteTrip: (tripId: string) => void;
  onResetData: (tripId: string) => void;
  onImportPeopleForTrip?: (tripId: string, people: Person[], mode: 'OVERWRITE' | 'APPEND') => void;
}

export const AdminTripManager: React.FC<AdminTripManagerProps> = ({
  currentTrip,
  trips,
  rooms,
  onSelectTrip,
  onSaveTrip,
  onDeleteTrip,
  onResetData,
  onImportPeopleForTrip
}) => {
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [importingTrip, setImportingTrip] = useState<Trip | null>(null);
  const [attachedPeople, setAttachedPeople] = useState<Person[]>([]);
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const [formImportError, setFormImportError] = useState<string>('');
  const [isProcessingFormFile, setIsProcessingFormFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<Partial<Trip>>({});

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingTrip(null);
    setAttachedPeople([]);
    setAttachedFileName('');
    setFormImportError('');
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
    setAttachedPeople([]);
    setAttachedFileName('');
    setFormImportError('');
    setFormData({
      ...t,
      deadline: t.deadline.slice(0, 16),
      roomLimits: t.roomLimits || { 2: 152, 3: 11, 4: 20, 5: 6, 6: 6 }
    });
  };

  const handleModalFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingFormFile(true);
    setFormImportError('');
    const result = await parseUploadedExcel(file);
    setIsProcessingFormFile(false);
    if (result.success && result.people.length > 0) {
      setAttachedPeople(result.people);
      setAttachedFileName(file.name);
    } else {
      setFormImportError(result.errors.join('; ') || 'Không tìm thấy dữ liệu nhân sự hợp lệ');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Vui lòng nhập tên chuyến đi.');
      return;
    }

    const tripToSave: Trip = {
      ...(formData as Trip),
      deadline: new Date(formData.deadline || '').toISOString(),
      ...(attachedPeople.length > 0 ? {
        lastImportedAt: new Date().toISOString(),
        lastImportedCount: attachedPeople.length
      } : {})
    };

    onSaveTrip(tripToSave, attachedPeople.length > 0 ? attachedPeople : undefined);
    if (attachedPeople.length > 0 && formData.id) {
      savePeople(formData.id, attachedPeople);
    }
    setEditingTrip(null);
    setIsCreating(false);
  };

  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Header */}
      <div className="glass-card admin-trip-header-card" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
            Quản Lý Tours & Khách Sạn (Multi-tour)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Hệ thống hỗ trợ quản lý nhiều tour/đợt du lịch độc lập, mỗi tour có danh sách và phòng riêng
          </p>
        </div>

        <button onClick={handleStartCreate} className="btn btn-primary" style={{ fontWeight: 700 }}>
          <Plus size={16} /> Thêm Tour Mới
        </button>
      </div>

      {/* Trips Row List (Dạng dòng thay cho dạng thẻ) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {trips.length === 0 ? (
          <div className="glass-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có tour nào được tạo. Vui lòng bấm "Thêm Tour Mới".
          </div>
        ) : (
          trips.map(trip => {
            const isActive = currentTrip ? trip.id === currentTrip.id : false;
            const importInfo = getTripImportInfo(trip);
            const tripPeople = getPeople(trip.id);
            const empCount = tripPeople.filter(p => p.type === 'EMPLOYEE').length;
            const relCount = tripPeople.filter(p => p.type === 'RELATIVE').length;
            const pgCount = tripPeople.filter(p => p.type === 'PG').length;

            return (
              <div
                key={trip.id}
                className="glass-card admin-tour-card"
                style={{
                  padding: '20px 24px',
                  border: isActive ? '2px solid var(--primary-500)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  boxShadow: isActive ? '0 4px 20px -2px rgba(37, 99, 235, 0.15)' : undefined
                }}
              >
                {/* 1. Header Dòng: Tên chuyến đi, Badges & Các nút hành động */}
                {/* 1. Header: Tiêu đề tour & Các nút chức năng trên cùng 1 hàng */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: importInfo ? 10 : 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      {trip.name}
                    </h4>

                    {isActive && (
                      <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}>
                        <CheckCircle size={13} /> Đang quản lý
                      </span>
                    )}

                    {trip.isLocked ? (
                      <span className="badge badge-danger" style={{ fontSize: '0.78rem' }}>
                        Đã khóa đăng ký
                      </span>
                    ) : (
                      <span className="badge badge-success" style={{ fontSize: '0.78rem' }}>
                        Đang mở đăng ký
                      </span>
                    )}
                  </div>

                  {/* Actions buttons nằm cùng hàng với tiêu đề tour */}
                  <div className="admin-tour-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {!isActive && (
                      <button
                        onClick={() => onSelectTrip(trip.id)}
                        className="btn btn-primary btn-sm"
                        style={{ fontWeight: 700 }}
                      >
                        Chọn làm việc
                      </button>
                    )}

                    <button
                      onClick={() => setImportingTrip(trip)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      title="Nhập danh sách nhân sự từ file Excel cho chuyến đi này"
                    >
                      <Upload size={14} /> Nhập Excel
                    </button>

                    <button
                      onClick={() => handleStartEdit(trip)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Edit size={14} /> Sửa
                    </button>

                    <button
                      onClick={() => setTripToDelete(trip)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--color-danger)' }}
                      title="Xóa chuyến đi này"
                    >
                      <Trash2 size={14} /> Xóa
                    </button>

                    {isActive && (
                      <button
                        onClick={() => setIsResetModalOpen(true)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--color-warning)' }}
                        title="Đặt lại toàn bộ dữ liệu chuyến đi về ban đầu"
                      >
                        <RotateCcw size={14} /> Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Dòng thông tin số người đã nhập chuyển xuống nằm dưới tiêu đề */}
                {importInfo && (
                  <div style={{ marginBottom: 12, maxWidth: '100%' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 6,
                        fontSize: '0.76rem',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.28)',
                        color: 'var(--text-main)',
                        padding: '5px 10px',
                        borderRadius: 6,
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        lineHeight: 1.45,
                        wordBreak: 'break-word'
                      }}
                      title={`Thời gian nạp danh sách: ${formatImportTime(importInfo.importedAt)}`}
                    >
                      <FileSpreadsheet size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                      <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '3px 6px', maxWidth: '100%' }}>
                        <span>
                          Đã nhập: <strong style={{ color: 'var(--color-success)' }}>{importInfo.count.toLocaleString('vi-VN')} người</strong>
                        </span>
                        {tripPeople.length > 0 && (
                          <span style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
                            ({empCount} Nhân viên, {relCount} Người thân{pgCount > 0 ? `, ${pgCount} PG` : ''})
                          </span>
                        )}
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span style={{ color: 'var(--text-muted)' }}>Lúc {formatImportTime(importInfo.importedAt)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Thông tin chi tiết chuyến đi (Dạng dòng ngang rộng rãi, không bị tràn) */}
                <div className="admin-tour-details-box" style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                  rowGap: 10,
                  fontSize: '0.86rem',
                  color: 'var(--text-muted)',
                  padding: '10px 14px',
                  background: 'var(--bg-muted)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Building size={15} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
                    <span><strong>Khách sạn:</strong> {trip.hotelName || 'Chưa cập nhật'}</span>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={15} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                    <span><strong>Địa điểm:</strong> {trip.location || 'Chưa cập nhật'}</span>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={15} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                    <span><strong>Thời gian:</strong> {trip.startDate} - {trip.endDate}</span>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={15} style={{ color: 'var(--color-info)', flexShrink: 0 }} />
                    <span><strong>Hạn chót:</strong> {new Date(trip.deadline).toLocaleString('vi-VN')}</span>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Users size={15} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                    <span>
                      <strong>Nhân sự:</strong> {tripPeople.length} người{' '}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        ({empCount} NV, {relCount} Thân{pgCount > 0 ? `, ${pgCount} PG` : ''})
                      </span>
                    </span>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Baby size={15} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                    <span><strong>Tối đa trẻ em:</strong> {trip.maxChildrenPerRoom || 2} trẻ/phòng</span>
                  </div>
                </div>

                {/* 3. Định mức số lượng phòng theo loại */}
                {(() => {
                  const tripRooms = (currentTrip && trip.id === currentTrip.id && rooms) ? rooms : getRooms(trip.id);
                  const totalCapLimit = [2, 3, 4, 5, 6].reduce((sum, cap) => sum + cap * (trip.roomLimits?.[cap] || 0), 0);
                  const totalRoomsLimit = [2, 3, 4, 5, 6].reduce((sum, cap) => sum + (trip.roomLimits?.[cap] || 0), 0);

                  return (
                    <div className="admin-tour-limits" style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                      fontSize: '0.82rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Định mức phòng:</span>
                        {totalCapLimit > 0 && (
                          <span className="badge" style={{
                            fontSize: '0.78rem',
                            padding: '3px 9px',
                            fontWeight: 800,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            👥 Tổng sức chứa: <strong>{totalCapLimit} người</strong> ({totalRoomsLimit} phòng)
                          </span>
                        )}
                      </div>
                      {[2, 3, 4, 5, 6].map(cap => {
                        const arrangedCount = tripRooms.filter(r => r.capacity === cap && r.memberIds && r.memberIds.length > 0).length;
                        const limit = trip.roomLimits?.[cap];
                        const isExceeded = limit !== undefined && arrangedCount > limit;
                        return (
                          <span
                            key={cap}
                            style={{
                              background: arrangedCount > 0 ? 'rgba(37, 99, 235, 0.06)' : 'var(--bg-card-solid)',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: isExceeded
                                ? '1px solid var(--color-danger)'
                                : arrangedCount > 0
                                  ? '1px solid rgba(37, 99, 235, 0.3)'
                                  : '1px solid var(--border-subtle)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5
                            }}
                          >
                            Phòng {cap} người:{' '}
                            <strong style={{
                              color: isExceeded
                                ? 'var(--color-danger)'
                                : arrangedCount > 0
                                  ? 'var(--primary-600)'
                                  : 'var(--text-muted)'
                            }}>
                              {limit !== undefined ? `${arrangedCount}/${limit}` : arrangedCount} phòng
                            </strong>
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
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
                {(() => {
                  const modalTotalCap = [2, 3, 4, 5, 6].reduce((sum, cap) => {
                    const defaultVal = cap === 2 ? 152 : cap === 3 ? 11 : cap === 4 ? 28 : 6;
                    const val = formData.roomLimits?.[cap] ?? defaultVal;
                    return sum + cap * (isNaN(val) ? 0 : val);
                  }, 0);
                  const modalTotalRooms = [2, 3, 4, 5, 6].reduce((sum, cap) => {
                    const defaultVal = cap === 2 ? 152 : cap === 3 ? 11 : cap === 4 ? 28 : 6;
                    const val = formData.roomLimits?.[cap] ?? defaultVal;
                    return sum + (isNaN(val) ? 0 : val);
                  }, 0);

                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', margin: 0, color: 'var(--text-main)' }}>
                          Giới Hạn Số Lượng Phòng Tối Đa (Theo Loại Phòng):
                        </label>
                        <span className="badge" style={{
                          fontSize: '0.82rem',
                          padding: '3px 10px',
                          fontWeight: 800,
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1.5px solid #93c5fd',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}>
                          👥 Tổng sức chứa: <strong>{modalTotalCap} người</strong> ({modalTotalRooms} phòng)
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                        Hệ thống sẽ tự động khóa và hiển thị màu xám cảnh báo khi số phòng đăng ký đạt số lượng tối đa này.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                        {[2, 3, 4, 5, 6].map(cap => {
                          const defaultVal = cap === 2 ? 152 : cap === 3 ? 11 : cap === 4 ? 28 : 6;
                          const currentVal = formData.roomLimits?.[cap] ?? defaultVal;
                          return (
                            <div key={cap} style={{ textAlign: 'center' }}>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: 4 }}>
                                {cap} Người
                              </label>
                              <input
                                type="number"
                                min={0}
                                className="input-field"
                                style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 700, fontSize: '0.95rem' }}
                                value={currentVal}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setFormData({
                                    ...formData,
                                    roomLimits: {
                                      ...(formData.roomLimits || { 2: 152, 3: 11, 4: 28, 5: 6, 6: 6 }),
                                      [cap]: isNaN(val) ? 0 : val
                                    }
                                  });
                                }}
                                placeholder="0"
                              />
                              <div style={{ fontSize: '0.72rem', color: 'var(--primary-600)', marginTop: 4, fontWeight: 700 }}>
                                = {currentVal * cap} chỗ
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: '1px dashed var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        flexWrap: 'wrap',
                        gap: 6
                      }}>
                        <span>Công thức tính sức chứa:</span>
                        <strong style={{ color: 'var(--primary-600)' }}>
                          {[2, 3, 4, 5, 6].map(cap => {
                            const defaultVal = cap === 2 ? 152 : cap === 3 ? 11 : cap === 4 ? 28 : 6;
                            const currentVal = formData.roomLimits?.[cap] ?? defaultVal;
                            return `${currentVal}x${cap}=${currentVal * cap}`;
                          }).join(' + ')} = {modalTotalCap} người
                        </strong>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--border-subtle)'
              }}>
                {/* Nút Xuất danh sách mẫu và Nhập Excel danh sách (Góc dưới bên trái như Hình 2) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={exportTemplatePersonnelExcel}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                    title="Tải file Excel mẫu gồm 5 cột chuẩn để điền danh sách"
                  >
                    <Download size={14} /> Xuất danh sách mẫu
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                    title="Tải lên file Excel danh sách nhân sự cho chuyến đi này"
                  >
                    <Upload size={14} /> Nhập Excel danh sách
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls"
                    style={{ display: 'none' }}
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    onChange={handleModalFileImport}
                  />

                  {isProcessingFormFile && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--primary-500)' }}>
                      Đang xử lý file...
                    </span>
                  )}

                  {attachedPeople.length > 0 && (
                    <span className="badge badge-success" style={{ fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={12} /> {attachedPeople.length} người ({attachedFileName})
                    </span>
                  )}

                  {formImportError && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>
                      {formImportError}
                    </span>
                  )}
                </div>

                {/* Các nút Hủy và Lưu */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setIsCreating(false); setEditingTrip(null); }}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                    Lưu Chuyến Đi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Chuyến Đi */}
      {tripToDelete && (
        <div className="modal-overlay" onClick={() => setTripToDelete(null)}>
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

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: 'var(--color-danger)' }}>
              Xóa Chuyến Đi?
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Bạn có chắc chắn muốn xóa chuyến đi <strong>"{tripToDelete.name}"</strong>? Toàn bộ danh sách nhân sự và cấu hình phòng của chuyến đi này sẽ bị xóa.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setTripToDelete(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1.3, fontWeight: 700 }}
                onClick={() => {
                  onDeleteTrip(tripToDelete.id);
                  setTripToDelete(null);
                }}
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Reset Dữ Liệu Chuyến Đi */}
      {isResetModalOpen && (
        <div className="modal-overlay" onClick={() => setIsResetModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450, padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(234, 179, 8, 0.1)',
              color: 'var(--color-warning)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <RotateCcw size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>
              Đặt Lại Dữ Liệu Ban Đầu?
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Thao tác này sẽ giải tán toàn bộ phòng hiện có và khôi phục danh sách 550 nhân sự của chuyến đi <strong>"{currentTrip?.name || ''}"</strong> về trạng thái mặc định chưa ghép phòng.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setIsResetModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-warning"
                style={{ flex: 1.4, fontWeight: 700, color: '#fff', background: 'var(--color-warning)' }}
                onClick={() => {
                  if (currentTrip) {
                    onResetData(currentTrip.id);
                  }
                  setIsResetModalOpen(false);
                }}
              >
                Xác Nhận Reset
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Nhập Excel cho Chuyến Đi */}
      {importingTrip && (
        <ExcelImportModal
          isOpen={!!importingTrip}
          tripTitle={importingTrip.name}
          onClose={() => setImportingTrip(null)}
          onConfirmImport={async (people, mode) => {
            if (onImportPeopleForTrip) {
              await onImportPeopleForTrip(importingTrip.id, people, mode);
            } else {
              await savePeople(importingTrip.id, people);
            }
            alert(`✓ Đã nạp thành công ${people.length} nhân sự vào chuyến đi "${importingTrip.name}"!`);
            setImportingTrip(null);
          }}
        />
      )}
    </div>
  );
};
