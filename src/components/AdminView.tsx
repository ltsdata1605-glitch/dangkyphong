import React, { useState } from 'react';
import { Person, Room, Trip, AuditLog } from '../types';
import { AdminDashboard } from './AdminDashboard';
import { AdminRoomManager } from './AdminRoomManager';
import { AdminPeopleManager } from './AdminPeopleManager';
import { AdminTripManager } from './AdminTripManager';
import { AdminAuditLogs } from './AdminAuditLogs';
import { ExcelImportModal } from './ExcelImportModal';
import {
  LayoutDashboard,
  Bed,
  Users,
  Compass,
  History,
  LogOut,
  ShieldCheck
} from 'lucide-react';

interface AdminViewProps {
  currentTrip: Trip | null;
  trips: Trip[];
  people: Person[];
  rooms: Room[];
  logs: AuditLog[];
  activeTab?: 'dashboard' | 'rooms' | 'people' | 'trips' | 'logs';
  onTabChange?: (tab: 'dashboard' | 'rooms' | 'people' | 'trips' | 'logs') => void;
  onSelectTrip: (tripId: string) => void;
  onSaveTrip: (trip: Trip, initialPeople?: Person[]) => void;
  onDeleteTrip: (tripId: string) => void;
  onResetData: (tripId: string) => void;
  onExportExcel: () => void;
  onAutoMatch: () => void;
  onToggleLock: () => void;
  onConfirmImport: (newPeople: Person[], mode: 'OVERWRITE' | 'APPEND') => void;
  onImportPeopleForTrip?: (tripId: string, newPeople: Person[], mode: 'OVERWRITE' | 'APPEND') => void;
  onDeleteRoom: (roomId: string) => void;
  onDeleteAllRooms: () => void;
  onRemoveMember: (roomId: string, personId: string) => void;
  onAddMember: (roomId: string, personId: string) => void;
  onCreateRoom?: (capacity: number, memberIds: string[]) => void;
  onSaveRoom?: (capacity: number, memberIds: string[], editingRoomId?: string) => void;
  onSaveOverride: (roomId: string, note: string) => void;
  onToggleGender: (personId: string) => void;
  onAssignRelative: (relativeId: string, employeeCode: string) => void;
  onLogoutAdmin: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentTrip,
  trips,
  people,
  rooms,
  logs,
  activeTab: externalActiveTab,
  onTabChange,
  onSelectTrip,
  onSaveTrip,
  onDeleteTrip,
  onResetData,
  onExportExcel,
  onAutoMatch,
  onToggleLock,
  onConfirmImport,
  onImportPeopleForTrip,
  onDeleteRoom,
  onDeleteAllRooms,
  onRemoveMember,
  onAddMember,
  onCreateRoom,
  onSaveRoom,
  onSaveOverride,
  onToggleGender,
  onAssignRelative,
  onLogoutAdmin
}) => {
  const [internalTab, setInternalTab] = useState<'dashboard' | 'rooms' | 'people' | 'trips' | 'logs'>('dashboard');
  const activeTab = externalActiveTab ?? internalTab;
  const setActiveTab = (tab: 'dashboard' | 'rooms' | 'people' | 'trips' | 'logs') => {
    if (onTabChange) onTabChange(tab);
    setInternalTab(tab);
  };
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <div style={{ width: '100%', margin: '20px 0' }}>
      {/* Admin Tabs Bar */}
      <div className="glass-card" style={{
        padding: '8px 12px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`btn btn-sm ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <LayoutDashboard size={16} /> Tổng Quan
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`btn btn-sm ${activeTab === 'rooms' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Bed size={16} /> Quản Lý Phòng ({rooms.length})
          </button>

          <button
            onClick={() => setActiveTab('people')}
            className={`btn btn-sm ${activeTab === 'people' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Users size={16} /> Danh Sách Tham Gia ({people.length})
          </button>

          <button
            onClick={() => setActiveTab('trips')}
            className={`btn btn-sm ${activeTab === 'trips' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Compass size={16} /> Quản Lý Tours ({trips.length})
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`btn btn-sm ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <History size={16} /> Nhật Ký
          </button>
        </div>

        <button
          onClick={onLogoutAdmin}
          className="btn btn-secondary btn-sm"
          style={{ color: 'var(--color-danger)' }}
          title="Đăng xuất quyền Admin"
        >
          <LogOut size={15} /> Đăng Xuất Admin
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'dashboard' && (
        currentTrip ? (
          <AdminDashboard
            currentTrip={currentTrip}
            people={people}
            rooms={rooms}
            onExportExcel={onExportExcel}
            onAutoMatch={onAutoMatch}
            onToggleLock={onToggleLock}
            onNavigateTab={setActiveTab}
          />
        ) : (
          <div className="glass-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có tour nào được chọn hoặc tạo. Vui lòng vào tab <strong>Quản Lý Tours</strong> để thêm tour mới.
          </div>
        )
      )}

      {activeTab === 'rooms' && (
        <AdminRoomManager
          rooms={rooms}
          people={people}
          onDeleteRoom={onDeleteRoom}
          onDeleteAllRooms={onDeleteAllRooms}
          onRemoveMember={onRemoveMember}
          onAddMember={onAddMember}
          onSaveOverride={onSaveOverride}
        />
      )}

      {activeTab === 'people' && (
        <AdminPeopleManager
          people={people}
          rooms={rooms}
          currentTrip={currentTrip || undefined}
          onToggleGender={onToggleGender}
          onAssignRelative={onAssignRelative}
          onAddMemberToRoom={onAddMember}
          onRemoveMemberFromRoom={onRemoveMember}
          onCreateRoomForPerson={onCreateRoom}
          onSaveRoomForPerson={onSaveRoom || onCreateRoom}
        />
      )}

      {activeTab === 'trips' && (
        <AdminTripManager
          currentTrip={currentTrip}
          trips={trips}
          rooms={rooms}
          onSelectTrip={onSelectTrip}
          onSaveTrip={onSaveTrip}
          onDeleteTrip={onDeleteTrip}
          onResetData={onResetData}
          onImportPeopleForTrip={onImportPeopleForTrip}
        />
      )}

      {activeTab === 'logs' && (
        <AdminAuditLogs logs={logs} />
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <ExcelImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onConfirmImport={onConfirmImport}
        />
      )}
    </div>
  );
};
