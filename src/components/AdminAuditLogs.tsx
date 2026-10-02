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

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE_ROOM':
        return <span className="badge badge-success">Tạo Phòng</span>;
      case 'LEAVE_ROOM':
        return <span className="badge badge-warning">Rời Phòng</span>;
      case 'DELETE_ROOM':
        return <span className="badge badge-danger">Hủy Phòng</span>;
      case 'AUTO_MATCH':
        return <span className="badge badge-primary">Ghép Tự Động</span>;
      case 'ASSIGN_RELATIVE':
        return <span className="badge badge-primary">Gán Người Thân</span>;
      case 'OVERRIDE':
        return <span className="badge badge-warning">Duyệt Đặc Cách</span>;
      case 'IMPORT_EXCEL':
        return <span className="badge badge-gray">Nhập Excel</span>;
      default:
        return <span className="badge badge-gray">{action}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <History size={20} style={{ color: 'var(--primary-500)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
            Nhật Ký Thao Tác Hệ Thống (Audit Logs)
          </h3>
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Tìm theo nội dung, người thao tác..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 38, height: 40 }}
          />
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Thời Gian</th>
                <th style={{ padding: '12px 16px' }}>Hành Động</th>
                <th style={{ padding: '12px 16px' }}>Người Thực Hiện</th>
                <th style={{ padding: '12px 16px' }}>Chi Tiết Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có nhật ký nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getActionBadge(log.action)}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {log.actorName} <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>({log.actor})</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-main)' }}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
