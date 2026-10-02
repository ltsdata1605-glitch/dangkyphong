import React, { useState } from 'react';
import { Person } from '../types';
import { parseUploadedExcel } from '../services/excelService';
import { Upload, AlertTriangle, CheckCircle2, FileSpreadsheet, X } from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (newPeople: Person[], mode: 'OVERWRITE' | 'APPEND') => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedPeople, setParsedPeople] = useState<Person[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'OVERWRITE' | 'APPEND'>('OVERWRITE');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    setErrors([]);
    setWarnings([]);

    const result = await parseUploadedExcel(selectedFile);
    setIsProcessing(false);

    if (result.success) {
      setParsedPeople(result.people);
      setErrors(result.errors);
      setWarnings(result.warnings);
    } else {
      setErrors(result.errors);
      setParsedPeople([]);
    }
  };

  const handleConfirm = () => {
    if (parsedPeople.length === 0) return;
    onConfirmImport(parsedPeople, importMode);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={20} style={{ color: 'var(--color-success)' }} />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              Tải Lên File Excel Danh Sách Đoàn
            </h3>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* File Picker */}
          <div style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 20px',
            textAlign: 'center',
            background: 'var(--bg-muted)',
            cursor: 'pointer',
            marginBottom: 16
          }}
            onClick={() => document.getElementById('excelFileInput')?.click()}
          >
            <Upload size={32} style={{ color: 'var(--primary-500)', marginBottom: 8 }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {file ? file.name : 'Bấm để chọn file Excel (.xlsx, .xls)'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Hỗ trợ mẫu chuẩn hoặc định dạng DANH SÁCH NHÂN VIÊN.xlsx hiện tại
            </div>
            <input
              id="excelFileInput"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {isProcessing && (
            <div style={{ textAlign: 'center', padding: 12, color: 'var(--primary-500)', fontWeight: 600 }}>
              Đang phân tích cấu trúc file Excel...
            </div>
          )}

          {/* Errors list */}
          {errors.length > 0 && (
            <div style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--color-danger)',
              fontSize: '0.84rem',
              marginBottom: 14
            }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={15} /> Lỗi đọc file:
              </div>
              <ul style={{ margin: '4px 0 0 18px' }}>
                {errors.map((e, idx) => <li key={idx}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Warnings list */}
          {warnings.length > 0 && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: 'var(--color-warning)',
              fontSize: '0.82rem',
              maxHeight: 120,
              overflowY: 'auto',
              marginBottom: 14
            }}>
              <div style={{ fontWeight: 700 }}>Cảnh báo dữ liệu ({warnings.length} dòng):</div>
              <ul style={{ margin: '4px 0 0 18px' }}>
                {warnings.map((w, idx) => <li key={idx}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Success Preview */}
          {parsedPeople.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--color-success)',
                fontWeight: 600,
                fontSize: '0.9rem',
                marginBottom: 14
              }}>
                <CheckCircle2 size={18} />
                Đã nhận diện thành công: {parsedPeople.length} người ({parsedPeople.filter(p => p.type === 'EMPLOYEE').length} nhân viên, {parsedPeople.filter(p => p.type !== 'EMPLOYEE').length} người thân/PG).
              </div>

              {/* Import Mode Selection */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>
                  Chế độ nạp dữ liệu:
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input
                      type="radio"
                      name="importMode"
                      value="OVERWRITE"
                      checked={importMode === 'OVERWRITE'}
                      onChange={() => setImportMode('OVERWRITE')}
                    />
                    <strong>Nhập mới (Xóa hết dữ liệu cũ)</strong>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input
                      type="radio"
                      name="importMode"
                      value="APPEND"
                      checked={importMode === 'APPEND'}
                      onChange={() => setImportMode('APPEND')}
                    />
                    <span>Bổ sung / Cập nhật</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={parsedPeople.length === 0}
              style={{ opacity: parsedPeople.length > 0 ? 1 : 0.5 }}
            >
              Xác Nhận Nạp Vào Hệ Thống
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
