import React, { useState, useEffect, useCallback } from 'react';
import { Person, Room, Trip, AuditLog, RelationType } from './types';
import {
  initializeStorage,
  initializeStorageAsync,
  getTrips,
  getActiveTrip,
  getActiveTripId,
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
  subscribeToStateChanges,
  fetchTripDataFromFirebase
} from './services/storageService';
import { validateRoom, autoMatchRooms } from './services/roomingEngine';
import { exportRoomingListExcel } from './services/excelService';

import { Navbar } from './components/Navbar';
import { LoadingScreen } from './components/LoadingScreen';
import { CountdownBanner } from './components/CountdownBanner';
import { EmployeeLogin } from './components/EmployeeLogin';
import { EmployeeRoomView } from './components/EmployeeRoomView';
import { AdminView } from './components/AdminView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AllRoomsDirectoryModal } from './components/AllRoomsDirectoryModal';
import { Bed, Search } from 'lucide-react';
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
  const [adminTab, setAdminTab] = useState<'dashboard' | 'rooms' | 'people' | 'trips' | 'logs'>('dashboard');
  const [employeeTab, setEmployeeTab] = useState<'my_room' | 'all_rooms'>('my_room');

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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(getActiveTrip());
  const [people, setPeople] = useState<Person[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Load and sync data
  const refreshData = useCallback(() => {
    const loadedTrips = getTrips();
    const active = getActiveTrip();
    const loadedPeople = active ? getPeople(active.id) : [];
    const loadedRooms = active ? getRooms(active.id) : [];
    const loadedLogs = active ? getLogs(active.id) : [];

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
    let isMounted = true;
    const initApp = async () => {
      try {
        await initializeStorageAsync();
      } catch (err) {
        console.warn('Initial storage load error:', err);
      }
      if (isMounted) {
        refreshData();
        setIsInitialLoading(false);
      }
    };

    initApp();

    const unsubscribe = subscribeToStateChanges(() => {
      refreshData();
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
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
        refreshData();
      } else {
        setIsAdminLoginModalOpen(true);
      }
    } else {
      setActiveRole('EMPLOYEE');
      refreshData();
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    sessionStorage.setItem('rooming_admin_auth', 'true');
    setActiveRole('ADMIN');
    refreshData();
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

  const handleSaveTrip = async (trip: Trip, initialPeople?: Person[]) => {
    if (initialPeople && initialPeople.length > 0) {
      trip.lastImportedAt = trip.lastImportedAt || new Date().toISOString();
      trip.lastImportedCount = initialPeople.length;
      await saveTrip(trip);
      await savePeople(trip.id, initialPeople);
      await saveRooms(trip.id, []);
    } else {
      await saveTrip(trip);
    }
    refreshData();
  };

  const handleDeleteTrip = async (tripId: string) => {
    await deleteTrip(tripId);
    refreshData();
  };

  const handleResetData = async (tripId: string) => {
    await resetDefaultData(tripId);
    refreshData();
  };

  // Tạo hoặc Sửa phòng
  const handleSaveRoom = async (capacity: number, memberIds: string[], editingRoomId?: string) => {
    if (!currentEmployee || !currentTrip) return;

    const currentPeople = getPeople(currentTrip.id);
    const currentRooms = getRooms(currentTrip.id);
    const members = memberIds.map(id => currentPeople.find(p => p.id === id)!).filter(Boolean);

    // Kiểm tra định mức phòng nếu có
    let actualCapacity = capacity;
    if (currentTrip.roomLimits) {
      const existingRoom = editingRoomId ? currentRooms.find(r => r.id === editingRoomId) : null;
      const isSwitchingCap = !existingRoom || existingRoom.capacity !== actualCapacity;
      const count = currentRooms.filter(r => r.id !== editingRoomId && r.capacity === actualCapacity && r.memberIds && r.memberIds.length > 0).length;
      const currentLimit = currentTrip.roomLimits[actualCapacity];
      if (currentLimit !== undefined && isSwitchingCap && count >= currentLimit) {
        const availableCap = [actualCapacity, actualCapacity + 1, actualCapacity + 2, 6].find(c => {
          if (c > 6) return false;
          const lim = currentTrip.roomLimits![c];
          const cnt = currentRooms.filter(r => r.id !== editingRoomId && r.capacity === c && r.memberIds && r.memberIds.length > 0).length;
          return lim === undefined || cnt < lim;
        });
        if (!availableCap) {
          alert(`⚠️ Loại phòng ${actualCapacity} người đã đạt định mức tối đa (${count}/${currentLimit} phòng). Không thể lưu thêm phòng loại này! Vui lòng chọn loại phòng khác.`);
          return;
        }
        actualCapacity = availableCap;
      }
    }

    const validation = validateRoom(members, actualCapacity, currentTrip.maxChildrenPerRoom, false);
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
      capacity: actualCapacity,
      leaderId: currentEmployee.id,
      memberIds,
      usedSlots: validation.usedSlots,
      childCount: validation.childCount,
      status: validation.usedSlots === actualCapacity ? 'FULL' : 'UNDER',
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

    await saveRooms(currentTrip.id, updatedRooms);
    await savePeople(currentTrip.id, currentPeople);

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
  const handleLeaveRoom = async (personId: string) => {
    if (!currentTrip) return;
    const actorId = currentEmployee ? currentEmployee.code : 'admin';
    const actorName = currentEmployee ? currentEmployee.name : 'Ban Tổ Chức';
    const res = await leaveRoom(currentTrip.id, personId, actorId, actorName);
    if (res.success) {
      const updatedPeople = getPeople(currentTrip.id);
      const updatedEmp = updatedPeople.find(p => p.id === personId || p.code === personId);
      if (updatedEmp) {
        localStorage.setItem('rooming_current_employee', JSON.stringify(updatedEmp));
        setCurrentEmployee(updatedEmp);
      } else {
        setCurrentEmployee(prev => {
          if (prev && (prev.id === personId || prev.code === personId)) {
            const updated = { ...prev, roomId: null };
            localStorage.setItem('rooming_current_employee', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }
      refreshData();
    } else {
      alert(res.message);
    }
  };

  // Xóa / Hủy phòng
  const handleDeleteRoom = async (roomId: string) => {
    if (!currentTrip) return;
    const actorId = currentEmployee ? currentEmployee.code : 'admin';
    const actorName = currentEmployee ? currentEmployee.name : 'Ban Tổ Chức';
    await deleteRoom(currentTrip.id, roomId, actorId, actorName);
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
  const handleDeleteAllRooms = async () => {
    if (!currentTrip) return;
    const actorId = currentEmployee ? currentEmployee.code : 'admin';
    const actorName = currentEmployee ? currentEmployee.name : 'Ban Tổ Chức';
    await deleteAllRooms(currentTrip.id, actorId, actorName);
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

  // Nhận người thân (chọn mối quan hệ) -> Tự động tạo phòng 2 người hoặc thêm vào phòng hiện tại
  const handleClaimRelative = async (relativeId: string, relation?: RelationType) => {
    if (!currentEmployee || !currentTrip) return;
    const res = await claimRelative(currentTrip.id, currentEmployee.code, relativeId, currentEmployee.name, relation);
    if (res.success) {
      // Cập nhật ngay currentEmployee với roomId mới từ storage để UI chuyển ngay lập tức
      const updatedPeople = getPeople(currentTrip.id);
      const updatedEmp = updatedPeople.find(p => p.id === currentEmployee.id || p.code === currentEmployee.code);
      if (updatedEmp) {
        localStorage.setItem('rooming_current_employee', JSON.stringify(updatedEmp));
        setCurrentEmployee(updatedEmp);
      }
      refreshData();
    }
  };

  // Hủy nhận người thân
  const handleUnclaimRelative = async (relativeId: string) => {
    if (!currentEmployee) return;
    const tripId = currentTrip?.id || getActiveTripId();
    const res = await unclaimRelative(tripId, currentEmployee.code, relativeId);
    
    // Đồng bộ lại currentEmployee nếu có thay đổi
    const updatedPeople = getPeople(tripId);
    const updatedEmp = updatedPeople.find(p => p.id === currentEmployee.id || p.code === currentEmployee.code);
    if (updatedEmp) {
      localStorage.setItem('rooming_current_employee', JSON.stringify(updatedEmp));
      setCurrentEmployee(updatedEmp);
    }
    
    refreshData();
    if (res.success) {
      alert(res.message);
    } else {
      alert(res.message || 'Không thể hủy nhận người thân này.');
    }
  };

  // Ghép phòng tự động
  const handleAutoMatch = async () => {
    if (!currentTrip) return;
    const res = autoMatchRooms(people, rooms, currentTrip.id, currentTrip.roomLimits);
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

    await saveRooms(currentTrip.id, updatedRooms);
    await savePeople(currentTrip.id, currentPeople);

    addLog(currentTrip.id, {
      id: `log_${Date.now()}`,
      tripId: currentTrip.id,
      action: 'AUTO_MATCH',
      actor: 'admin',
      actorName: 'Ban Tổ Chức',
      details: `Hệ thống đã tự động ghép ${res.assignedCount} người (Cùng siêu thị: ${res.sameStoreCount || 0} người, Khác siêu thị: ${res.crossStoreCount || 0} người)`,
      timestamp: new Date().toISOString()
    });

    try {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    } catch {
      // Ignored
    }

    const totalRemaining = currentPeople.filter(p => !p.roomId && p.slot > 0).length;
    let alertMsg = `🎉 Đã tự động ghép thành công ${res.assignedCount} người vào các phòng theo đúng định mức!\n\n` +
      `🏢 Ghép cùng siêu thị: ${res.sameStoreCount || 0} người\n` +
      `🌐 Ghép khác siêu thị: ${res.crossStoreCount || 0} người`;
    if (totalRemaining > 0) {
      alertMsg += `\n\n⚠️ Lưu ý: Còn ${totalRemaining} người chưa thể ghép phòng do tất cả các loại phòng định mức của khách sạn đã đạt giới hạn tối đa!`;
    }
    alert(alertMsg);
    refreshData();
  };

  // Xuất Excel Rooming List
  const handleExportExcel = async () => {
    if (!currentTrip) return;
    
    // 1. Lấy dữ liệu mới nhất từ storage và cả React state
    let exportPeople = getPeople(currentTrip.id);
    let exportRooms = getRooms(currentTrip.id);

    if (exportPeople.length === 0) exportPeople = people;
    if (exportRooms.length === 0) exportRooms = rooms;

    // 2. Nếu danh sách phòng vẫn rỗng (do browser cache chưa kịp nạp), tải trực tiếp từ Firebase
    if (exportRooms.length === 0 || exportPeople.length === 0) {
      try {
        const remoteData = await fetchTripDataFromFirebase(currentTrip.id);
        if (remoteData.rooms.length > 0) exportRooms = remoteData.rooms;
        if (remoteData.people.length > 0) exportPeople = remoteData.people;
      } catch (err) {
        console.warn('Lỗi nạp bổ sung khi xuất Excel:', err);
      }
    }

    if (exportRooms.length === 0) {
      alert('Hiện chưa có dữ liệu phòng nào được lưu để xuất danh sách. Vui lòng kiểm tra lại!');
      return;
    }

    exportRoomingListExcel(currentTrip, exportPeople, exportRooms);
  };

  // Khóa / Mở đăng ký
  const handleToggleLock = async () => {
    if (!currentTrip) return;
    const updatedTrip: Trip = {
      ...currentTrip,
      isLocked: !currentTrip.isLocked
    };
    await saveTrip(updatedTrip);
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
  const handleConfirmImport = async (targetTripId: string, newPeople: Person[], mode: 'OVERWRITE' | 'APPEND') => {
    const tripId = targetTripId || currentTrip?.id;
    if (!tripId) return;
    let finalCount = 0;
    if (mode === 'OVERWRITE') {
      await savePeople(tripId, newPeople);
      await saveRooms(tripId, []);
      finalCount = newPeople.length;
    } else {
      const existing = getPeople(tripId);
      const merged = [...existing];
      newPeople.forEach(np => {
        const idx = merged.findIndex(p => p.code === np.code && p.type === np.type);
        if (idx >= 0) {
          // Cập nhật thông tin mới nhất từ file Excel (giữ lại phòng và người nhận nếu đã có)
          merged[idx] = {
            ...np,
            id: merged[idx].id,
            roomId: merged[idx].roomId,
            ownerId: merged[idx].ownerId || np.ownerId
          };
        } else {
          merged.push(np);
        }
      });
      await savePeople(tripId, merged);
      finalCount = merged.length;
    }

    const importTime = new Date().toISOString();

    // Cập nhật thời gian nhập và tổng số người đã nhập cho chuyến đi
    const allTrips = getTrips();
    const targetTrip = allTrips.find(t => t.id === tripId);
    if (targetTrip) {
      targetTrip.lastImportedAt = importTime;
      targetTrip.lastImportedCount = finalCount;
      await saveTrip(targetTrip);
    }

    addLog(tripId, {
      id: `log_${Date.now()}`,
      tripId: tripId,
      action: 'IMPORT_EXCEL',
      actor: 'admin',
      actorName: 'Ban Tổ Chức',
      details: `Đã nạp file Excel danh sách (${newPeople.length} người - Chế độ: ${mode})`,
      timestamp: importTime
    });

    refreshData();
  };

  // Admin đổi nhanh giới tính
  const handleToggleGender = async (personId: string) => {
    if (!currentTrip) return;
    const currentPeople = getPeople(currentTrip.id);
    const p = currentPeople.find(cp => cp.id === personId);
    if (p) {
      p.gender = p.gender === 'M' ? 'F' : 'M';
      await savePeople(currentTrip.id, currentPeople);
      refreshData();
    }
  };

  // Admin gán người thân cho nhân viên
  const handleAdminAssignRelative = async (relativeId: string, employeeCode: string) => {
    if (!currentTrip) return;
    const res = await claimRelative(currentTrip.id, employeeCode, relativeId, 'Ban Tổ Chức');
    refreshData();
    if (res.success && res.roomCode) {
      alert(`Đã gán người thân cho nhân viên ${employeeCode} thành công (Phòng: ${res.roomCode})!`);
    }
  };

  // Admin thêm người vào phòng
  const handleAdminAddMember = async (roomId: string, personId: string): Promise<boolean> => {
    if (!currentTrip) return false;
    const currentPeople = getPeople(currentTrip.id);
    const currentRooms = getRooms(currentTrip.id);
    const room = currentRooms.find(r => r.id === roomId);
    const person = currentPeople.find(p => p.id === personId);

    if (!room || !person) return false;

    if (room.memberIds.length >= 6) {
      alert('Phòng đã đạt giới hạn tối đa 6 người/phòng. Không thể thêm tiếp!');
      return false;
    }

    if (room.memberIds.includes(person.id)) {
      alert('Thành viên này đã có trong phòng!');
      return false;
    }

    // Tính toán số suất người lớn trước khi thêm
    const members = room.memberIds.map(id => currentPeople.find(p => p.id === id)!).filter(Boolean);
    const currentAdultSlots = members.filter(m => (m.slot ?? 1) > 0).length;
    const personSlot = (person.slot ?? 1);
    const projectedAdultSlots = currentAdultSlots + (personSlot > 0 ? 1 : 0);

    // Chốt chặn định mức: Nếu thêm người khiến số người lớn vượt sức chứa cũ
    if (projectedAdultSlots > room.capacity) {
      const nextCapacity = Math.min(6, projectedAdultSlots);
      if (currentTrip.roomLimits) {
        const availableCap = [nextCapacity, nextCapacity + 1, nextCapacity + 2, 6].find(c => {
          if (c > 6) return false;
          const lim = currentTrip.roomLimits![c];
          const count = currentRooms.filter(r => r.id !== room.id && r.capacity === c && r.memberIds && r.memberIds.length > 0).length;
          return lim === undefined || count < lim;
        });

        if (!availableCap) {
          const lim = currentTrip.roomLimits[nextCapacity];
          const count = currentRooms.filter(r => r.id !== room.id && r.capacity === nextCapacity && r.memberIds && r.memberIds.length > 0).length;
          alert(`⚠️ KHÔNG THỂ THÊM THÀNH VIÊN VÀO PHÒNG ${room.code}!\n\nViệc thêm "${person.name}" khiến số người lớn (${projectedAdultSlots}) vượt sức chứa cũ (${room.capacity} người).\nTuy nhiên các loại phòng từ ${nextCapacity} đến 6 người đều đã đạt định mức tối đa (${count}/${lim} phòng).\n\nHệ thống từ chối và không cho phép nâng sức chứa phòng!`);
          return false;
        }
        room.capacity = availableCap;
      } else {
        room.capacity = nextCapacity;
      }
    }

    room.memberIds.push(person.id);
    person.roomId = room.id;

    const updatedMembers = room.memberIds.map(id => currentPeople.find(p => p.id === id)!).filter(Boolean);
    const validation = validateRoom(updatedMembers, room.capacity, currentTrip.maxChildrenPerRoom, room.adminOverride);

    room.usedSlots = validation.usedSlots;
    room.childCount = validation.childCount;
    room.status = validation.usedSlots === room.capacity ? 'FULL' : 'UNDER';
    room.bedType = validation.bedType;
    room.updatedAt = new Date().toISOString();
    room.updatedBy = 'Admin BTC';

    await saveRooms(currentTrip.id, currentRooms);
    await savePeople(currentTrip.id, currentPeople);
    refreshData();
    return true;
  };

  // Admin gỡ người khỏi phòng (hoặc xóa phòng hoàn toàn nếu chỉ còn người này)
  const handleAdminRemoveMember = async (roomId: string, personId: string) => {
    if (!currentTrip) return;
    const currentRooms = getRooms(currentTrip.id);
    const room = currentRooms.find(r => r.id === roomId);
    if (room && (room.memberIds.length <= 1 || room.memberIds.every(id => id === personId))) {
      await deleteRoom(currentTrip.id, room.id, 'admin', 'Ban Tổ Chức');
    } else {
      await leaveRoom(currentTrip.id, personId, 'admin', 'Ban Tổ Chức', roomId);
    }
    refreshData();
  };

  // Admin tạo hoặc sửa phòng cho nhân sự
  const handleAdminSaveRoom = async (capacity: number, memberIds: string[], editingRoomId?: string) => {
    if (!currentTrip) return;
    const currentPeople = getPeople(currentTrip.id);
    const currentRooms = getRooms(currentTrip.id);
    const members = memberIds.map(id => currentPeople.find(p => p.id === id)!).filter(Boolean);

    // Tự động nâng loại phòng nếu số người lớn vượt quá sức chứa ban đầu (tối đa 6)
    const adultSlots = members.filter(m => m.slot > 0).length;
    let actualCapacity = Math.max(capacity, Math.min(6, adultSlots));

    // Kiểm tra định mức phòng
    if (currentTrip.roomLimits) {
      const existingRoom = editingRoomId ? currentRooms.find(r => r.id === editingRoomId) : null;
      const isSwitchingCap = !existingRoom || existingRoom.capacity !== actualCapacity;
      const count = currentRooms.filter(r => r.id !== editingRoomId && r.capacity === actualCapacity && r.memberIds && r.memberIds.length > 0).length;
      const currentLimit = currentTrip.roomLimits[actualCapacity];
      if (currentLimit !== undefined && isSwitchingCap && count >= currentLimit) {
        const availableCap = [actualCapacity, actualCapacity + 1, actualCapacity + 2, 6].find(c => {
          if (c > 6) return false;
          const lim = currentTrip.roomLimits![c];
          const cnt = currentRooms.filter(r => r.id !== editingRoomId && r.capacity === c && r.memberIds && r.memberIds.length > 0).length;
          return lim === undefined || cnt < lim;
        });
        if (!availableCap) {
          alert(`⚠️ Loại phòng ${actualCapacity} người đã đạt định mức tối đa (${count}/${currentLimit} phòng). Không thể lưu thêm phòng loại này!`);
          return;
        }
        actualCapacity = availableCap;
      }
    }

    const validation = validateRoom(members, actualCapacity, currentTrip.maxChildrenPerRoom, true);
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
        currentPeople.forEach(p => {
          if (p.roomId === editingRoomId && !memberIds.includes(p.id)) {
            p.roomId = null;
          }
        });
        existing.capacity = actualCapacity;
        existing.memberIds = memberIds;
        existing.usedSlots = validation.usedSlots;
        existing.childCount = validation.childCount;
        existing.status = validation.usedSlots === actualCapacity ? 'FULL' : 'UNDER';
        existing.bedType = validation.bedType;
        existing.updatedAt = new Date().toISOString();
        existing.updatedBy = 'Admin BTC';
      }
    } else {
      roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const existingNums = currentRooms
        .map(r => {
          const match = r.code.match(/^P\.(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      roomCode = `P.${nextNum}`;

      const newRoom: Room = {
        id: roomId,
        tripId: currentTrip.id,
        code: roomCode,
        capacity: actualCapacity,
        leaderId: memberIds[0] || 'admin',
        memberIds,
        usedSlots: validation.usedSlots,
        childCount: validation.childCount,
        status: validation.usedSlots === actualCapacity ? 'FULL' : 'UNDER',
        bedType: validation.bedType,
        adminOverride: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'Admin BTC'
      };
      currentRooms.push(newRoom);
    }

    memberIds.forEach(id => {
      const p = currentPeople.find(cp => cp.id === id);
      if (p) p.roomId = roomId!;
    });
    await saveRooms(currentTrip.id, currentRooms);
    await savePeople(currentTrip.id, currentPeople);

    addLog(currentTrip.id, {
      id: `log_${Date.now()}`,
      tripId: currentTrip.id,
      action: editingRoomId ? 'UPDATE_ROOM' : 'CREATE_ROOM',
      actor: 'admin',
      actorName: 'Ban Tổ Chức',
      details: editingRoomId
        ? `Admin đã cập nhật phòng ${roomCode} (${capacity} người): ${members.map(m => m.name).join(', ')}`
        : `Admin đã tạo phòng mới ${roomCode} (${capacity} người) cho ${members.map(m => m.name).join(', ')}`,
      timestamp: new Date().toISOString()
    });

    refreshData();
  };

  // Admin duyệt đặc cách
  const handleAdminSaveOverride = async (roomId: string, note: string) => {
    if (!currentTrip) return;
    const currentRooms = getRooms(currentTrip.id);
    const room = currentRooms.find(r => r.id === roomId);
    if (room) {
      room.adminOverride = true;
      room.adminNote = note;
      await saveRooms(currentTrip.id, currentRooms);
      addLog(currentTrip.id, {
        id: `log_${Date.now()}`,
        tripId: currentTrip.id,
        action: 'OVERRIDE',
        actor: 'admin',
        actorName: 'Ban Tổ Chức',
        details: `Duyệt đặc cách cho phòng ${room.code}: "${note}"`,
        timestamp: new Date().toISOString()
      });
    }
    refreshData();
  };

  if (isInitialLoading) {
    return <LoadingScreen />;
  }

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
      <div className="app-main-container" style={{ maxWidth: 1200, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* 2. Countdown Banner & Trip Overview */}
        {currentTrip && (
          <CountdownBanner
            trip={currentTrip}
            totalRoomsCount={rooms.length}
            rooms={rooms}
            onOpenAllRooms={(activeRole === 'ADMIN' || !!currentEmployee) ? () => {
              if (activeRole === 'ADMIN') {
                setAdminTab('rooms');
              } else {
                setEmployeeTab('all_rooms');
              }
            } : undefined}
          />
        )}

        {/* 3. Main Views */}
        <main style={{ flex: 1, paddingBottom: 60, width: '100%' }}>
          {activeRole === 'EMPLOYEE' ? (
            !currentEmployee ? (
              <EmployeeLogin
                people={people}
                onLogin={handleEmployeeLogin}
              />
            ) : (
              <div>
                {/* Employee Navigation Tabs Bar */}
                <div className="glass-card" style={{
                  padding: '6px 12px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setEmployeeTab('my_room')}
                      className={`btn btn-sm ${employeeTab === 'my_room' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      <Bed size={15} /> Phòng Của Tôi
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmployeeTab('all_rooms')}
                      className={`btn btn-sm ${employeeTab === 'all_rooms' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      <Search size={15} /> Xem Phòng Đã Đăng Ký ({rooms.length})
                    </button>
                  </div>
                </div>

                {employeeTab === 'all_rooms' ? (
                  currentTrip ? (
                    <AllRoomsDirectoryModal
                      isInline={true}
                      trip={currentTrip}
                      rooms={rooms}
                      people={people}
                      currentEmployee={currentEmployee}
                      onClose={() => setEmployeeTab('my_room')}
                    />
                  ) : null
                ) : (
                  currentTrip ? (
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
                      onOpenAllRooms={() => setEmployeeTab('all_rooms')}
                    />
                  ) : (
                    <div className="glass-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chưa có chuyến đi nào được mở đăng ký. Vui lòng liên hệ Ban Tổ Chức.
                    </div>
                  )
                )}
              </div>
            )
          ) : (
            <AdminView
              currentTrip={currentTrip}
              trips={trips}
              people={people}
              rooms={rooms}
              logs={logs}
              activeTab={adminTab}
              onTabChange={setAdminTab}
              onSelectTrip={handleSelectTrip}
              onSaveTrip={handleSaveTrip}
              onDeleteTrip={handleDeleteTrip}
              onResetData={handleResetData}
              onExportExcel={handleExportExcel}
              onAutoMatch={handleAutoMatch}
              onToggleLock={handleToggleLock}
              onConfirmImport={(newPeople, mode) => currentTrip && handleConfirmImport(currentTrip.id, newPeople, mode)}
              onImportPeopleForTrip={handleConfirmImport}
              onDeleteRoom={handleDeleteRoom}
              onDeleteAllRooms={handleDeleteAllRooms}
              onRemoveMember={handleAdminRemoveMember}
              onAddMember={handleAdminAddMember}
              onCreateRoom={handleAdminSaveRoom}
              onSaveRoom={handleAdminSaveRoom}
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
    </div>
  );
};

export default App;
