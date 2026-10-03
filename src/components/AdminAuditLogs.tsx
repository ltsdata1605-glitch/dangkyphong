import React, { useState } from 'react';
import { AuditLog } from '../types';
import { Clock, Shield, History, Search } from 'lucide-react';

interface AdminAuditLogsProps {
  logs: AuditLog[];
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.details.toLowerCase().includes(term) ||
      log.actorName.toLowerCase().includes(term) ||
      log.actor.toLowerCase().includes(term)
    );
  });

  const formatDateParts = (timestamp: string) => {
    try {
      const d = new Date(timestamp);
      const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return { timeStr, dateStr };
    } catch {
      return { timeStr: timestamp, dateStr: '' };
    }
  };

  const getActionBadge = (action: AuditLog['action']) => {
    const badgeStyle: React.CSSProperties = {
      fontSize: '0.68rem',
      padding: '2px 5px',
      lineHeight: 1.25,
      whiteSpace: 'normal',
      display: 'inline-block',
      textAlign: 'center',
      borderRadius: 4
    };
    switch (action) {
      case 'CREATE_ROOM':
        return <span className="badge badge-success" style={badgeStyle}>Tạo Phòng</span>;
      case 'LEAVE_ROOM':
        return <span className="badge badge-warning" style={badgeStyle}>Rời Phòng</span>;
      case 'DELETE_ROOM':
        return <span className="badge badge-danger" style={badgeStyle}>Hủy Phòng</span>;
      case 'AUTO_MATCH':
        return <span className="badge badge-primary" style={badgeStyle}>Ghép Tự Động</span>;
      case 'ASSIGN_RELATIVE':
        return <span className="badge badge-primary" style={badgeStyle}>Gán Người Thân</span>;
      case 'OVERRIDE':
        return <span className="badge badge-warning" style={badgeStyle}>Duyệt Đặc Cách</span>;
      case 'IMPORT_EXCEL':
        return <span className="badge badge-gray" style={badgeStyle}>Nhập Excel</span>;
      default:
        return <span className="badge badge-gray" style={badgeStyle}>{action}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="glass-card audit-header-card" style={{
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={18} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
          <h3 className="audit-title" style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', lineHeight: 1.3 }}>
            Nhật Ký Thao Tác Hệ Thống (Audit Logs)
          </h3>
        </div>

        <div className="audit-search-box" style={{ position: 'relative', width: 220, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field audit-search-input"
            placeholder="Tìm theo nội dung, người..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 30, height: 32, fontSize: '0.78rem', borderRadius: 'var(--radius-sm)' }}
          />
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="audit-logs-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th className="audit-col-time" style={{ padding: '8px 10px', width: 85, minWidth: 78 }}>Thời Gian</th>
                <th className="audit-col-action" style={{ padding: '8px 10px', width: 85, minWidth: 80 }}>Hành Động</th>
                <th className="audit-col-actor" style={{ padding: '8px 10px', width: 110, minWidth: 95 }}>Người Thực Hiện</th>
                <th className="audit-col-details" style={{ padding: '8px 10px' }}>Chi Tiết Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có nhật ký nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const { timeStr, dateStr } = formatDateParts(log.timestamp);
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="audit-col-time" style={{ padding: '8px 10px', fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{timeStr}</div>
                        <div style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>{dateStr}</div>
                      </td>
                      <td className="audit-col-action" style={{ padding: '8px 10px' }}>
                        {getActionBadge(log.action)}
                      </td>
                      <td className="audit-col-actor" style={{ padding: '8px 10px', fontSize: '0.78rem', lineHeight: 1.35 }}>
                        <div style={{ fontWeight: 700 }}>{log.actorName}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({log.actor})</div>
                      </td>
                      <td className="audit-col-details" style={{ padding: '8px 10px', fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
