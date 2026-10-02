import { Person, Room, Trip, AuditLog } from '../types';
import seedPeople from '../data_sample.json';

const STORAGE_KEYS = {
  TRIPS: 'rooming_trips_v1',
  ACTIVE_TRIP: 'rooming_active_trip_id_v1',
  PEOPLE_PREFIX: 'rooming_people_',
  ROOMS_PREFIX: 'rooming_rooms_',
  LOGS_PREFIX: 'rooming_logs_',
  FIREBASE_CONFIG: 'rooming_firebase_config_v1'
};

const DEFAULT_TRIP: Trip = {
  id: 'trip_phuquoc_2026_d1',
  name: 'Đoàn Du Lịch Phú Quốc - Đợt 1 (10/2026)',
  hotelName: 'Vinpearl Resort & Spa Phú Quốc',
  location: 'Bãi Dài, Gành Dầu, TP. Phú Quốc, Kiên Giang',
  startDate: '2026-10-20',
  endDate: '2026-10-23',
  deadline: '2026-10-15T23:59:00',
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
};

/**
 * Khởi tạo dữ liệu mặc định nếu chưa có
 */
export function initializeStorage(): void {
  // 1. Kiểm tra danh sách chuyến đi
  let trips = getTrips();
  if (trips.length === 0) {
    trips = [DEFAULT_TRIP];
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  }

  // 2. Kiểm tra chuyến đi active
  let activeTripId = getActiveTripId();
  if (!activeTripId || !trips.some(t => t.id === activeTripId)) {
    activeTripId = trips[0].id;
    setActiveTripId(activeTripId);
  }

  // 3. Nạp danh sách nhân sự mẫu (550 người từ file Excel thực tế) cho chuyến đi đầu tiên nếu chưa có
  const people = getPeople(activeTripId);
  if (people.length === 0) {
    const initialPeople: Person[] = (seedPeople as any[]).map(p => ({
      ...p,
      nameUnsigned: p.name ? p.name.toLowerCase() : ''
    }));
    savePeople(activeTripId, initialPeople);

    // Ghi log khởi tạo
    addLog(activeTripId, {
      id: `log_init_${Date.now()}`,
      tripId: activeTripId,
      action: 'IMPORT_EXCEL',
      actor: 'system',
      actorName: 'Hệ Thống',
      details: `Đã nạp tự động 550 nhân sự từ file DANH SÁCH NHÂN VIÊN.xlsx`,
      timestamp: new Date().toISOString()
    });
  }
}

export function getTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRIPS);
    const parsed: Trip[] = raw ? JSON.parse(raw) : [];
    return parsed.map(t => ({
      ...t,
      roomLimits: t.roomLimits || { 2: 152, 3: 11, 4: 20, 5: 6, 6: 6 }
    }));
  } catch {
    return [];
  }
}

export function saveTrip(trip: Trip): void {
  const trips = getTrips();
  const index = trips.findIndex(t => t.id === trip.id);
  if (index >= 0) {
    trips[index] = trip;
  } else {
    trips.unshift(trip);
  }
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  notifyStateChange();
}

export function deleteTrip(tripId: string): void {
  let trips = getTrips();
  trips = trips.filter(t => t.id !== tripId);
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));

  localStorage.removeItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`);
  localStorage.removeItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`);
  localStorage.removeItem(`${STORAGE_KEYS.LOGS_PREFIX}${tripId}`);

  if (getActiveTripId() === tripId) {
    if (trips.length > 0) {
      setActiveTripId(trips[0].id);
    } else {
      initializeStorage();
    }
  }
  notifyStateChange();
}

export function getActiveTripId(): string {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP) || DEFAULT_TRIP.id;
}

export function setActiveTripId(tripId: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP, tripId);
  notifyStateChange();
}

export function getActiveTrip(): Trip {
  const trips = getTrips();
  const activeId = getActiveTripId();
  return trips.find(t => t.id === activeId) || trips[0] || DEFAULT_TRIP;
}

export function getPeople(tripId: string): Person[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePeople(tripId: string, people: Person[]): void {
  localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(people));
  notifyStateChange();
}

export function getRooms(tripId: string): Room[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRooms(tripId: string, rooms: Room[]): void {
  localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(rooms));
  notifyStateChange();
}

export function getLogs(tripId: string): AuditLog[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.LOGS_PREFIX}${tripId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addLog(tripId: string, log: AuditLog): void {
  const logs = getLogs(tripId);
  logs.unshift(log);
  if (logs.length > 500) logs.pop();
  localStorage.setItem(`${STORAGE_KEYS.LOGS_PREFIX}${tripId}`, JSON.stringify(logs));
  notifyStateChange();
}

/**
 * Nhân viên nhận người thân cùng siêu thị (Claim Relative)
 */
export function claimRelative(tripId: string, employeeCode: string, relativeId: string, employeeName: string): boolean {
  const people = getPeople(tripId);
  const employee = people.find(p => p.code === employeeCode);
  const relative = people.find(p => p.id === relativeId);

  if (!employee || !relative) return false;

  relative.ownerId = employee.code;
  if (!relative.code.includes(employee.code)) {
    relative.code = `${employee.code}-NT`;
  }

  savePeople(tripId, people);

  addLog(tripId, {
    id: `log_${Date.now()}`,
    tripId,
    action: 'ASSIGN_RELATIVE',
    actor: employee.code,
    actorName: employee.name,
    details: `${employee.name} (${employee.code}) đã xác nhận người thân "${relative.name}" (${relative.relation || 'Người thân'})`,
    timestamp: new Date().toISOString()
  });

  return true;
}

/**
 * Rời khỏi phòng
 */
export function leaveRoom(tripId: string, personId: string, actorId: string, actorName: string): { success: boolean; message: string } {
  const people = getPeople(tripId);
  const rooms = getRooms(tripId);
  const person = people.find(p => p.id === personId);

  if (!person || !person.roomId) {
    return { success: false, message: 'Người này chưa có trong phòng nào.' };
  }

  const roomIndex = rooms.findIndex(r => r.id === person.roomId);
  if (roomIndex < 0) {
    person.roomId = null;
    savePeople(tripId, people);
    return { success: true, message: 'Đã cập nhật trạng thái.' };
  }

  const room = rooms[roomIndex];

  // Nếu người rời phòng là TRƯỞNG PHÒNG
  if (room.leaderId === person.id) {
    // Nếu phòng chỉ còn 1 người (chính người đó) -> Giải tán phòng
    if (room.memberIds.length <= 1) {
      rooms.splice(roomIndex, 1);
      person.roomId = null;
      saveRooms(tripId, rooms);
      savePeople(tripId, people);

      addLog(tripId, {
        id: `log_${Date.now()}`,
        tripId,
        action: 'DELETE_ROOM',
        actor: actorId,
        actorName,
        details: `${actorName} đã giải tán phòng ${room.code}`,
        timestamp: new Date().toISOString()
      });

      return { success: true, message: 'Đã giải tán phòng.' };
    }

    // Nếu còn người khác: Chuyển quyền trưởng phòng cho thành viên nhân viên tiếp theo
    const otherMembers = room.memberIds.filter(id => id !== person.id);
    const nextEmployee = otherMembers.map(id => people.find(p => p.id === id)!).find(p => p && p.type === 'EMPLOYEE');

    if (nextEmployee) {
      room.leaderId = nextEmployee.id;
    } else {
      room.leaderId = otherMembers[0];
    }
  }

  // Xóa khỏi danh sách thành viên
  room.memberIds = room.memberIds.filter(id => id !== person.id);
  person.roomId = null;

  // Tính lại suất
  const remainingMembers = room.memberIds.map(id => people.find(p => p.id === id)!).filter(Boolean);
  room.usedSlots = remainingMembers.filter(m => m.slot > 0).length;
  room.childCount = remainingMembers.filter(m => m.slot === 0).length;
  room.status = room.usedSlots === room.capacity ? 'FULL' : 'UNDER';
  room.updatedAt = new Date().toISOString();
  room.updatedBy = actorName;

  // Nếu người rời phòng là nhân viên và có con < 12 tuổi đi kèm trong phòng -> Bỏ con ra theo quy tắc R5
  const childrenOfThisPerson = remainingMembers.filter(m => m.slot === 0 && m.ownerId === person.code);
  for (const child of childrenOfThisPerson) {
    room.memberIds = room.memberIds.filter(id => id !== child.id);
    child.roomId = null;
  }

  saveRooms(tripId, rooms);
  savePeople(tripId, people);

  addLog(tripId, {
    id: `log_${Date.now()}`,
    tripId,
    action: 'LEAVE_ROOM',
    actor: actorId,
    actorName,
    details: `${person.name} đã rời khỏi phòng ${room.code}`,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: `Đã rời phòng ${room.code}.` };
}

/**
 * Xóa phòng hoàn toàn (Admin hoặc Trưởng phòng hủy)
 */
export function deleteRoom(tripId: string, roomId: string, actorId: string, actorName: string): boolean {
  const people = getPeople(tripId);
  const rooms = getRooms(tripId);
  const room = rooms.find(r => r.id === roomId);

  if (!room) return false;

  // Đưa tất cả thành viên về trạng thái không có phòng
  people.forEach(p => {
    if (p.roomId === roomId || (room.memberIds && room.memberIds.includes(p.id))) {
      p.roomId = null;
    }
  });

  const updatedRooms = rooms.filter(r => r.id !== roomId);
  saveRooms(tripId, updatedRooms);
  savePeople(tripId, people);

  addLog(tripId, {
    id: `log_${Date.now()}`,
    tripId,
    action: 'DELETE_ROOM',
    actor: actorId,
    actorName,
    details: `${actorName} đã hủy phòng ${room.code}`,
    timestamp: new Date().toISOString()
  });

  return true;
}

/**
 * Xóa toàn bộ phòng đã tạo trong chuyến đi (Admin)
 */
export function deleteAllRooms(tripId: string, actorId: string, actorName: string): boolean {
  const people = getPeople(tripId);
  people.forEach(p => {
    p.roomId = null;
  });

  saveRooms(tripId, []);
  savePeople(tripId, people);

  addLog(tripId, {
    id: `log_${Date.now()}`,
    tripId,
    action: 'DELETE_ROOM',
    actor: actorId,
    actorName,
    details: `${actorName} đã xóa toàn bộ danh sách phòng`,
    timestamp: new Date().toISOString()
  });

  return true;
}

/**
 * Khôi phục dữ liệu ban đầu
 */
export function resetDefaultData(tripId: string): void {
  const initialPeople: Person[] = (seedPeople as any[]).map(p => ({
    ...p,
    roomId: null,
    nameUnsigned: p.name ? p.name.toLowerCase() : ''
  }));
  savePeople(tripId, initialPeople);
  saveRooms(tripId, []);
  addLog(tripId, {
    id: `log_${Date.now()}`,
    tripId,
    action: 'IMPORT_EXCEL',
    actor: 'admin',
    actorName: 'Ban Tổ Chức',
    details: 'Đã đặt lại dữ liệu phòng về trạng thái ban đầu',
    timestamp: new Date().toISOString()
  });
}

// Event Dispatcher for cross-component re-renders
const listeners = new Set<() => void>();

export function subscribeToStateChanges(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyStateChange(): void {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error(e);
    }
  });
}
