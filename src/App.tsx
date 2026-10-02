import React, { useState, useEffect, useCallback } from 'react';
import { Person, Room, Trip, AuditLog, RelationType } from './types';
import {
  initializeStorage,
  getTrips,
  getActiveTrip,
  saveTrip,
  deleteTrip,
  setActiveTripId,
  getPeople,
  savePeople,
  getRooms,
  saveRooms,
  getLogs,
  addLog,
  claimRelative,
  unclaimRelative,
  leaveRoom,
  deleteRoom,
  deleteAllRooms,
  resetDefaultData,
  subscribeToStateChanges
} from './services/storageService';
import { validateRoom, autoMatchRooms } from './services/roomingEngine';
import { exportRoomingListExcel } from './services/excelService';

import { Navbar } from './components/Navbar';
import { CountdownBanner } from './components/CountdownBanner';
import { EmployeeLogin } from './components/EmployeeLogin';
import { EmployeeRoomView } from './components/EmployeeRoomView';
import { AdminView } from './components/AdminView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AllRoomsDirectoryModal } from './components/AllRoomsDirectoryModal';
import confetti from 'canvas-confetti';

export const App: React.FC = () => {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('rooming_theme') === 'dark';
  });

  // App Role: 'EMPLOYEE' or 'ADMIN'
  const [activeRole, setActiveRole] = useState<'EMPLOYEE' | 'ADMIN'>('EMPLOYEE');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('rooming_admin_auth') === 'true';
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isAllRoomsModalOpen, setIsAllRoomsModalOpen] = useState(false);

  // Employee Authentication state
  const [currentEmployee, setCurrentEmployee] = useState<Person | null>(() => {
    try {
      const saved = localStorage.getItem('rooming_current_employee');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Trip & Data States
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip>(getActiveTrip());
  const [people, setPeople] = useState<Person[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Load and sync data
  const refreshData = useCallback(() => {
    const loadedTrips = getTrips();
    const active = getActiveTrip();
    const loadedPeople = getPeople(active.id);
    const loadedRooms = getRooms(active.id);
    const loadedLogs = getLogs(active.id);

    setTrips(loadedTrips);
    setCurrentTrip(active);
    setPeople(loadedPeople);
    setRooms(loadedRooms);
    setLogs(loadedLogs);

    // Refresh current employee data safely without triggering re-render cascades
    setCurrentEmployee(prev => {
      if (!prev) return null;
      const refreshedEmp = loadedPeople.find(p => p.id === prev.id || p.code === prev.code);
      if (refreshedEmp) {
        if (refreshedEmp.roomId !== prev.roomId || refreshedEmp.name !== prev.name || refreshedEmp.gender !== prev.gender) {
          localStorage.setItem('rooming_current_employee', JSON.stringify(refreshedEmp));
          return refreshedEmp;
        }
      }
      return prev;
    });
  }, []);

  // Initial load
  useEffect(() => {
    initializeStorage();
    refreshData();
    const unsubscribe = subscribeToStateChanges(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, [refreshData]);

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('rooming_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Switch role handler
  const handleSwitchRole = (targetRole: 'EMPLOYEE' | 'ADMIN') => {
    if (targetRole === 'ADMIN') {
      if (isAdminLoggedIn) {
        setActiveRole('ADMIN');
      } else {
        setIsAdminLoginModalOpen(true);
      }
    } else {
      setActiveRole('EMPLOYEE');
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    sessionStorage.setItem('rooming_admin_auth', 'true');
    setActiveRole('ADMIN');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('rooming_admin_auth');
    setActiveRole('EMPLOYEE');
  };

  const handleEmployeeLogin = (emp: Person) => {
    setCurrentEmployee(emp);
    localStorage.setItem('rooming_current_employee', JSON.stringify(emp));
  };

  const handleEmployeeLogout = () => {
    setCurrentEmployee(null);
    localStorage.removeItem('rooming_current_employee');
  };

  const handleSelectTrip = (tripId: string) => {
    setActiveTripId(tripId);
    refreshData();
  };

  const handleSaveTrip = (trip: Trip, initialPeople?: Person[]) => {
    saveTrip(trip);
    if (initialPeople && initialPeople.length > 0) {
      savePeople(trip.id, initialPeople);
      saveRooms(trip.id, []);
    }
    refreshData();
  };

  const handleDeleteTrip = (tripId: string) => {
    deleteTrip(tripId);
    refreshData();
  };

  const handleResetData = (tripId: string) => {
    resetDefaultData(tripId);
    refreshData();
  };

  // Tạo hoặc Sửa phòng
  const handleSaveRoom = (capacity: number, memberIds: string[], editingRoomId?: string) => {
    if (!currentEmployee) return;

    const currentPeople = getPeople(currentTrip.id);
    const currentRooms = getRooms(currentTrip.id);
    const members = memberIds.map(id => currentPeople.find(p => p.id === id)!).filter(Boolean);

    const validation = validateRoom(members, capacity, currentTrip.maxChildrenPerRoom, false);
    if (!validation.valid) {
      alert(validation.errors.join('\n'));
      return;
    }

    let roomId = editingRoomId;
    let roomCode = '';

    if (editingRoomId) {
      const existing = currentRooms.find(r => r.id === editingRoomId);
      if (existing) {
        roomCode = existing.code;
        // Gỡ phòng cũ cho những người bị loại ra
        currentPeople.forEach(p => {
          if (p.roomId === editingRoomId && !memberIds.includes(p.id)) {
            p.roomId = null;
          }
        });
      }
    } else {
      roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      // Số phòng bắt đầu từ 1: Tìm số phòng lớn nhất hiện tại
      const existingNums = currentRooms
        .map(r => {
          const match = r.code.match(/^P\.(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      roomCode = `P.${nextNum}`;
    }

    const room: Room = {
      id: roomId!,
      tripId: currentTrip.id,
      code: roomCode,
      capacity,
      leaderId: currentEmployee.id,
      memberIds,
      usedSlots: validation.usedSlots,
      childCount: validation.childCount,
      status: validation.usedSlots === capacity ? 'FULL' : 'UNDER',
      bedType: validation.bedType,
      adminOverride: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentEmployee.name
    };

    // Cập nhật roomId cho các thành viên mới
    currentPeople.forEach(p => {
      if (memberIds.includes(p.id)) {
        p.roomId = roomId!;
      }
    });

    const updatedRooms = editingRoomId
      ? currentRooms.map(r => r.id === editingRoomId ? room : r)
      : [...currentRooms, room];

    saveRooms(currentTrip.id, updatedRooms);
    savePeople(currentTrip.id, currentPeople);

    addLog(currentTrip.id, {
      id: `log_${Date.now()}`,
      tripId: currentTrip.id,
      action: editingRoomId ? 'UPDATE_ROOM' : 'CREATE_ROOM',
      actor: currentEmployee.code,
      actorName: currentEmployee.name,
      details: `${currentEmployee.name} đã ${editingRoomId ? 'cập nhật' : 'tạo'} phòng ${room.code} (${capacity} người - ${memberIds.length} thành viên)`,
      timestamp: new Date().toISOString()
    });

    refreshData();
  };

  // Rời phòng
  const handleLeaveRoom = (personId: string) => {
    const actorId = currentEmployee ? currentEmployee.code : 'admin';
    const actorName = currentEmployee ? currentEmployee.name : 'Ban Tổ Chức';
    const res = leaveRoom(currentTrip.id, personId, actorId, actorName);
    if (res.success) {
      setCurrentEmployee(prev => {
        if (prev && (prev.id === personId || prev.code === personId)) {
          const updated = { ...prev, roomId: null };
          localStorage.setItem('rooming_current_employee', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
      refreshData();
    } else {
      alert(res.message);
    }
  };

  // Xóa / Hủy phòng
  const handleDeleteRoom = (roomId: string) => {
    const actorId = currentEmployee ? currentEmployee.code : 'admin';
    const actorName = currentEmployee ? currentEmployee.name : 'Ban Tổ Chức';
    deleteRoom(currentTrip.id, roomId, actorId, actorName);
    setCurrentEmployee(prev => {
      if (prev && prev.roomId === roomId) {
        const updated = { ...prev, roomId: null };
        localStorage.setItem('rooming_current_employee', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
    refreshData();
  };

  // Xóa toàn bộ phòng
  const handleDeleteAllRooms = () => {
    const actorId = currentEmployee ? currentEmployee.code : 'admin';
    const actorName = currentEmployee ? currentEmployee.name : 'Ban Tổ Chức';
    deleteAllRooms(currentTrip.id, actorId, actorName);
    setCurrentEmployee(prev => {
      if (prev && prev.roomId) {
        const updated = { ...prev, roomId: null };
        localStorage.setItem('rooming_current_employee', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
    refreshData();
  };

  // Nhận người thân (chọn mối quan hệ)
  const handleClaimRelative = (relativeId: string, relation?: RelationType) => {
    if (!currentEmployee) return;
    claimRelative(currentTrip.id, currentEmployee.code, relativeId, currentEmployee.name, relation);
    refreshData();
  };

  // Hủy nhận người thân
  const handleUnclaimRelative = (relativeId: string) => {
    if (!currentEmployee) return;
    unclaimRelative(currentTrip.id, currentEmployee.code, relativeId);
    refreshData();
  };

  // Ghép phòng tự động
  const handleAutoMatch = () => {
    const res = autoMatchRooms(people, rooms, currentTrip.id);
    if (res.assignedCount === 0) {
      alert('Không còn nhân sự trống nào có thể tự động ghép.');
      return;
    }

    const updatedRooms = [...rooms];
    // Cập nhật các phòng đã có
    res.updatedRooms.forEach(ur => {
      const idx = updatedRooms.findIndex(r => r.id === ur.id);
      if (idx >= 0) updatedRooms[idx] = ur;
    });
    // Thêm các phòng mới
    updatedRooms.push(...res.newRooms);

    // Cập nhật người
    const currentPeople = getPeople(currentTrip.id);
    res.newRooms.forEach(nr => {
      nr.memberIds.forEach(mId => {
        const p = currentPeople.find(cp => cp.id === mId);
        if (p) p.roomId = nr.id;
      });
    });
    res.updatedRooms.forEach(ur => {
      ur.memberIds.forEach(mId => {
        const p = currentPeople.find(cp => cp.id === mId);
        if (p) p.roomId = ur.id;
      });
    });

    saveRooms(currentTrip.id, updatedRooms);
    savePeople(currentTrip.id, currentPeople);

    addLog(currentTrip.id, {
      id: `log_${Date.now()}`,
      tripId: currentTrip.id,
      action: 'AUTO_MATCH',
      actor: 'admin',
      actorName: 'Ban Tổ Chức',
      details: `Hệ thống đã tự động ghép ${res.assignedCount} người vào các phòng`,
      timestamp: new Date().toISOString()
    });

    try {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    } catch {
      // Ignored
    }

    alert(`🎉 Đã tự động ghép thành công ${res.assignedCount} người vào các phòng!`);
    refreshData();
  };

  // Xuất Excel Rooming List
  const handleExportExcel = () => {
    exportRoomingListExcel(currentTrip, people, rooms);
  };

  // Khóa / Mở đăng ký
  const handleToggleLock = () => {
    const updatedTrip: Trip = {
      ...currentTrip,
      isLocked: !currentTrip.isLocked
    };
    saveTrip(updatedTrip);
    addLog(currentTrip.id, {
      id: `log_${Date.now()}`,
      tripId: currentTrip.id,
      action: 'OVERRIDE',
      actor: 'admin',
      actorName: 'Ban Tổ Chức',
      details: `Đã ${updatedTrip.isLocked ? 'KHÓA' : 'MỞ LẠI'} đăng ký phòng`,
      timestamp: new Date().toISOString()
    });
    refreshData();
  };

  // Admin nạp file Excel cho một chuyến đi cụ thể
  const handleConfirmImport = (targetTripId: string, newPeople: Person[], mode: 'OVERWRITE' | 'APPEND') => {
    const tripId = targetTripId || currentTrip.id;
    if (mode === 'OVERWRITE') {
      savePeople(tripId, newPeople);
      saveRooms(tripId, []);
    } else {
      const existing = getPeople(tripId);
      const merged = [...existing];
      newPeople.forEach(np => {
        if (!merged.some(p => p.code === np.code && p.name === np.name)) {
          merged.push(np);
        }
      });
      savePeople(tripId, merged);
    }

    addLog(tripId, {
      id: `log_${Date.now()}`,
      tripId: tripId,
      action: 'IMPORT_EXCEL',
      actor: 'admin',
      actorName: 'Ban Tổ Chức',
      details: `Đã nạp file Excel danh sách (${newPeople.length} người - Chế độ: ${mode})`,
      timestamp: new Date().toISOString()
    });

    refreshData();
  };

  // Admin đổi nhanh giới tính
  const handleToggleGender = (personId: string) => {
    const currentPeople = getPeople(currentTrip.id);
    const p = currentPeople.find(cp => cp.id === personId);
    if (p) {
      p.gender = p.gender === 'M' ? 'F' : 'M';
      savePeople(currentTrip.id, currentPeople);
      refreshData();
    }
  };

  // Admin gán người thân cho nhân viên
  const handleAdminAssignRelative = (relativeId: string, employeeCode: string) => {
    claimRelative(currentTrip.id, employeeCode, relativeId, 'Ban Tổ Chức');
    refreshData();
  };

  // Admin thêm người vào phòng
  const handleAdminAddMember = (roomId: string, personId: string) => {
    const currentPeople = getPeople(currentTrip.id);
    const currentRooms = getRooms(currentTrip.id);
    const room = currentRooms.find(r => r.id === roomId);
    const person = currentPeople.find(p => p.id === personId);

    if (!room || !person) return;

    room.memberIds.push(person.id);
    person.roomId = room.id;

    const members = room.memberIds.map(id => currentPeople.find(p => p.id === id)!).filter(Boolean);
    const validation = validateRoom(members, room.capacity, currentTrip.maxChildrenPerRoom, room.adminOverride);

    room.usedSlots = validation.usedSlots;
    room.childCount = validation.childCount;
    room.status = validation.usedSlots === room.capacity ? 'FULL' : 'UNDER';
    room.bedType = validation.bedType;

    saveRooms(currentTrip.id, currentRooms);
    savePeople(currentTrip.id, currentPeople);
    refreshData();
  };

  // Admin gỡ người khỏi phòng
  const handleAdminRemoveMember = (roomId: string, personId: string) => {
    leaveRoom(currentTrip.id, personId, 'admin', 'Ban Tổ Chức');
    refreshData();
  };

  // Admin duyệt đặc cách
  const handleAdminSaveOverride = (roomId: string, note: string) => {
    const currentRooms = getRooms(currentTrip.id);
    const room = currentRooms.find(r => r.id === roomId);
    if (room) {
      room.adminOverride = true;
      room.adminNote = note;
      saveRooms(currentTrip.id, currentRooms);
      addLog(currentTrip.id, {
        id: `log_${Date.now()}`,
        tripId: currentTrip.id,
        action: 'OVERRIDE',
        actor: 'admin',
        actorName: 'Ban Tổ Chức',
        details: `Duyệt đặc cách cho phòng ${room.code}: "${note}"`,
        timestamp: new Date().toISOString()
      });
      refreshData();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. App Navbar */}
      <Navbar
        currentTrip={currentTrip}
        trips={trips}
        onSelectTrip={handleSelectTrip}
        activeRole={activeRole}
        onSwitchRole={handleSwitchRole}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        loggedInEmployeeName={currentEmployee?.name}
        onLogoutEmployee={handleEmployeeLogout}
      />

      {/* Page Content Container - Perfectly aligns CountdownBanner with Admin and Employee views */}
      <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* 2. Countdown Banner & Trip Overview */}
        <CountdownBanner
          trip={currentTrip}
          totalRoomsCount={rooms.length}
          onOpenAllRooms={() => setIsAllRoomsModalOpen(true)}
        />

        {/* 3. Main Views */}
        <main style={{ flex: 1, paddingBottom: 60, width: '100%' }}>
          {activeRole === 'EMPLOYEE' ? (
            !currentEmployee ? (
              <EmployeeLogin
                people={people}
                onLogin={handleEmployeeLogin}
              />
            ) : (
              <EmployeeRoomView
                currentEmployee={currentEmployee}
                currentTrip={currentTrip}
                allPeople={people}
                allRooms={rooms}
                onSaveRoom={handleSaveRoom}
                onLeaveRoom={handleLeaveRoom}
                onDeleteRoom={handleDeleteRoom}
                onClaimRelative={handleClaimRelative}
                onUnclaimRelative={handleUnclaimRelative}
                onOpenAllRooms={() => setIsAllRoomsModalOpen(true)}
              />
            )
          ) : (
            <AdminView
              currentTrip={currentTrip}
              trips={trips}
              people={people}
              rooms={rooms}
              logs={logs}
              onSelectTrip={handleSelectTrip}
              onSaveTrip={handleSaveTrip}
              onDeleteTrip={handleDeleteTrip}
              onResetData={handleResetData}
              onExportExcel={handleExportExcel}
              onAutoMatch={handleAutoMatch}
              onToggleLock={handleToggleLock}
              onConfirmImport={(newPeople, mode) => handleConfirmImport(currentTrip.id, newPeople, mode)}
              onImportPeopleForTrip={handleConfirmImport}
              onDeleteRoom={handleDeleteRoom}
              onDeleteAllRooms={handleDeleteAllRooms}
              onRemoveMember={handleAdminRemoveMember}
              onAddMember={handleAdminAddMember}
              onSaveOverride={handleAdminSaveOverride}
              onToggleGender={handleToggleGender}
              onAssignRelative={handleAdminAssignRelative}
              onLogoutAdmin={handleAdminLogout}
            />
          )}
        </main>
      </div>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Tra Cứu Tất Cả Các Phòng Đã Sắp Xếp */}
      {isAllRoomsModalOpen && (
        <AllRoomsDirectoryModal
          isOpen={isAllRoomsModalOpen}
          onClose={() => setIsAllRoomsModalOpen(false)}
          trip={currentTrip}
          rooms={rooms}
          people={people}
          currentEmployee={currentEmployee}
        />
      )}
    </div>
  );
};

export default App;
