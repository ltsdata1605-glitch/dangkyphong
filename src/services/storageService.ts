import { Person, Room, Trip, AuditLog } from '../types';
import seedPeople from '../data_sample.json';
import { db } from './firebase';
import { doc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';

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

// Firestore Unsubscribe references
let tripsListUnsub: Unsubscribe | null = null;
let peopleUnsub: Unsubscribe | null = null;
let roomsUnsub: Unsubscribe | null = null;
let logsUnsub: Unsubscribe | null = null;

/**
 * Lắng nghe và đồng bộ dữ liệu Real-time từ Firebase Firestore
 */
export function setupFirestoreListeners(tripId: string): void {
  // Hủy các listener cũ của chuyến đi trước (nếu đổi chuyến đi)
  if (peopleUnsub) { peopleUnsub(); peopleUnsub = null; }
  if (roomsUnsub) { roomsUnsub(); roomsUnsub = null; }
  if (logsUnsub) { logsUnsub(); logsUnsub = null; }

  // 1. Lắng nghe danh sách tất cả các chuyến đi
  if (!tripsListUnsub) {
    try {
      tripsListUnsub = onSnapshot(doc(db, 'system', 'trips'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.trips) && data.trips.length > 0) {
            localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(data.trips));
            notifyStateChange();
          }
        } else {
          syncTripsToFirebase();
        }
      }, (err) => {
        console.warn('[Firebase Firestore] trips sync warning (offline or permissions):', err);
      });
    } catch (err) {
      console.warn('[Firebase] Init trips listener error:', err);
    }
  }

  // 2. Lắng nghe danh sách nhân sự của chuyến đi hiện tại
  try {
    peopleUnsub = onSnapshot(doc(db, 'trips', tripId, 'data', 'people'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.people)) {
          localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(data.people));
          notifyStateChange();
        }
      } else {
        const currentPeople = getPeople(tripId);
        if (currentPeople.length > 0) {
          syncPeopleToFirebase(tripId, currentPeople);
        }
      }
    }, (err) => {
      console.warn('[Firebase Firestore] people sync warning:', err);
    });
  } catch (err) {
    console.warn('[Firebase] Init people listener error:', err);
  }

  // 3. Lắng nghe danh sách phòng của chuyến đi hiện tại
  try {
    roomsUnsub = onSnapshot(doc(db, 'trips', tripId, 'data', 'rooms'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.rooms)) {
          const { rooms: normalized, migrated } = migrateRoomCodes(data.rooms);
          localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(normalized));
          if (migrated) {
            syncRoomsToFirebase(tripId, normalized);
          }
          notifyStateChange();
        }
      } else {
        syncRoomsToFirebase(tripId, getRooms(tripId));
      }
    }, (err) => {
      console.warn('[Firebase Firestore] rooms sync warning:', err);
    });
  } catch (err) {
    console.warn('[Firebase] Init rooms listener error:', err);
  }

  // 4. Lắng nghe audit logs
  try {
    logsUnsub = onSnapshot(doc(db, 'trips', tripId, 'data', 'logs'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.logs)) {
          localStorage.setItem(`${STORAGE_KEYS.LOGS_PREFIX}${tripId}`, JSON.stringify(data.logs));
          notifyStateChange();
        }
      } else {
        syncLogsToFirebase(tripId);
      }
    }, (err) => {
      console.warn('[Firebase Firestore] logs sync warning:', err);
    });
  } catch (err) {
    console.warn('[Firebase] Init logs listener error:', err);
  }
}

/**
 * Đẩy dữ liệu nhân sự lên Firebase
 */
export async function syncPeopleToFirebase(tripId: string, people: Person[]): Promise<void> {
  try {
    await setDoc(doc(db, 'trips', tripId, 'data', 'people'), {
      people,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Firebase] Ghi dữ liệu nhân sự lỗi:', err);
  }
}

/**
 * Đẩy dữ liệu phòng lên Firebase
 */
export async function syncRoomsToFirebase(tripId: string, rooms: Room[]): Promise<void> {
  try {
    await setDoc(doc(db, 'trips', tripId, 'data', 'rooms'), {
      rooms,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Firebase] Ghi dữ liệu phòng lỗi:', err);
  }
}

/**
 * Đẩy danh sách chuyến đi lên Firebase
 */
export async function syncTripsToFirebase(): Promise<void> {
  try {
    await setDoc(doc(db, 'system', 'trips'), {
      trips: getTrips(),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Firebase] Ghi danh sách chuyến đi lỗi:', err);
  }
}

/**
 * Đẩy nhật ký hệ thống lên Firebase
 */
export async function syncLogsToFirebase(tripId: string): Promise<void> {
  try {
    await setDoc(doc(db, 'trips', tripId, 'data', 'logs'), {
      logs: getLogs(tripId),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Firebase] Ghi nhật ký lỗi:', err);
  }
}

/**
 * Khởi tạo dữ liệu mặc định và kích hoạt Firebase Realtime Sync
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

  // 4. Kích hoạt Firebase Realtime Listener
  setupFirestoreListeners(activeTripId);

  // 5. Chuẩn hóa số phòng bắt đầu từ 1 cho tất cả các chuyến đi
  trips.forEach(t => {
    getRooms(t.id);
  });
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
  syncTripsToFirebase();
  notifyStateChange();
}

export function deleteTrip(tripId: string): void {
  let trips = getTrips();
  trips = trips.filter(t => t.id !== tripId);
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));

  localStorage.removeItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`);
  localStorage.removeItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`);
  localStorage.removeItem(`${STORAGE_KEYS.LOGS_PREFIX}${tripId}`);

  syncTripsToFirebase();

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
  setupFirestoreListeners(tripId);
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
  syncPeopleToFirebase(tripId, people);
  notifyStateChange();
}

/**
 * Chuẩn hóa số phòng bắt đầu từ 1:
 * Chuyển các phòng dạng cũ như P.101, P.102, P.103... thành P.1, P.2, P.3...
 */
export function migrateRoomCodes(rooms: Room[]): { rooms: Room[], migrated: boolean } {
  if (!rooms || rooms.length === 0) return { rooms, migrated: false };

  // Kiểm tra nếu có phòng dạng P.101 hoặc P.10x và chưa có phòng P.1
  const hasLegacy101 = rooms.some(r => r.code === 'P.101' || /^P\.10\d+$/.test(r.code));
  const hasP1 = rooms.some(r => r.code === 'P.1');

  if (hasLegacy101 && !hasP1) {
    const updated = rooms.map(r => {
      const match = r.code.match(/^P\.(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= 101) {
          return {
            ...r,
            code: `P.${num - 100}`,
            updatedAt: new Date().toISOString()
          };
        }
      }
      return r;
    });
    return { rooms: updated, migrated: true };
  }

  return { rooms, migrated: false };
}

export function getRooms(tripId: string): Room[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`);
    const rooms: Room[] = raw ? JSON.parse(raw) : [];
    const { rooms: normalized, migrated } = migrateRoomCodes(rooms);
    if (migrated) {
      localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(normalized));
      syncRoomsToFirebase(tripId, normalized);
    }
    return normalized;
  } catch {
    return [];
  }
}

export function saveRooms(tripId: string, rooms: Room[]): void {
  localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(rooms));
  syncRoomsToFirebase(tripId, rooms);
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
  localStorage.setItem(`${STORAGE_KEYS.LOGS_PREFIX}${tripId}`, JSON.stringify(logs.slice(0, 100)));
  syncLogsToFirebase(tripId);
  notifyStateChange();
}

/**
 * Gán / Nhận người thân vào nhân viên bảo trợ
 */
export function claimRelative(tripId: string, employeeCode: string, relativeId: string, employeeName?: string): boolean {
  const people = getPeople(tripId);
  const employee = people.find(p => p.code === employeeCode && p.type === 'EMPLOYEE');
  const relative = people.find(p => p.id === relativeId && p.type === 'RELATIVE');

  if (!employee || !relative) return false;

  relative.ownerId = employee.code;
  savePeople(tripId, people);

  addLog(tripId, {
    id: `log_${Date.now()}`,
    tripId,
    action: 'ASSIGN_RELATIVE',
    actor: employee.code,
    actorName: employee.name,
    details: `${employee.name} (${employee.code}) đã nhận người thân "${relative.name}" (${relative.relation || 'Người thân'})`,
    timestamp: new Date().toISOString()
  });

  return true;
}

/**
 * Admin gán người thân cho nhân viên
 */
export function assignRelativeAdmin(tripId: string, employeeCode: string, relativeId: string): boolean {
  const people = getPeople(tripId);
  const employee = people.find(p => p.code === employeeCode && p.type === 'EMPLOYEE');
  const relative = people.find(p => p.id === relativeId && p.type === 'RELATIVE');

  if (!employee || !relative) return false;

  relative.ownerId = employee.code;

  if (employee.roomId) {
    const rooms = getRooms(tripId);
    const room = rooms.find(r => r.id === employee.roomId);
    if (room && !room.memberIds.includes(relative.id)) {
      room.memberIds.push(relative.id);
      relative.roomId = room.id;
      saveRooms(tripId, rooms);
    }
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

    const remainingMembers = room.memberIds
      .filter(id => id !== person.id)
      .map(id => people.find(p => p.id === id)!)
      .filter(Boolean);

    const nextEmployee = remainingMembers.find(m => m.type === 'EMPLOYEE');
    if (!nextEmployee) {
      rooms.splice(roomIndex, 1);
      room.memberIds.forEach(mId => {
        const p = people.find(item => item.id === mId);
        if (p) p.roomId = null;
      });
      saveRooms(tripId, rooms);
      savePeople(tripId, people);
      return { success: true, message: 'Đã giải tán phòng do không còn nhân viên nào trong phòng.' };
    }

    room.leaderId = nextEmployee.id;
  }

  room.memberIds = room.memberIds.filter(id => id !== person.id);
  person.roomId = null;

  const remainingMembers = room.memberIds
    .map(id => people.find(p => p.id === id)!)
    .filter(Boolean);

  room.usedSlots = remainingMembers.reduce((sum, m) => sum + (m.slot || 0), 0);
  room.childCount = remainingMembers.filter(m => m.slot === 0).length;
  room.status = room.usedSlots === room.capacity ? 'FULL' : 'UNDER';
  room.updatedAt = new Date().toISOString();
  room.updatedBy = actorName;

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
