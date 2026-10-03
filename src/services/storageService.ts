import { Person, Room, Trip, AuditLog, RelationType, BedType } from '../types';
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
 * Gán / Nhận người thân vào nhân viên bảo trợ (cho phép chọn mối quan hệ)
 * TỰ ĐỘNG TẠO PHÒNG VỚI NGƯỜI THÂN:
 * - Nếu là Vợ/Chồng, Con -> Mặc định tạo phòng 2 người (capacity = 2).
 *   Riêng đối với con < 11 tuổi (CHILD_U5, CHILD_5_11) thì ở cùng người thân, slot = 0 (không tính là 1 người).
 * - Nếu nhân viên đã có phòng: Tự động thêm người thân vào phòng hiện tại.
 */
export function claimRelative(
  tripId: string, 
  employeeCode: string, 
  relativeId: string, 
  employeeName?: string,
  relation?: RelationType
): { success: boolean; roomCode?: string; isNewRoom?: boolean; message?: string } {
  const people = getPeople(tripId);
  const employee = people.find(p => p.code === employeeCode && p.type === 'EMPLOYEE');
  const relative = people.find(p => p.id === relativeId && p.type === 'RELATIVE');

  if (!employee || !relative) {
    return { success: false, message: 'Không tìm thấy thông tin nhân viên hoặc người thân.' };
  }

  // 1. Gán người thân cho nhân viên
  relative.ownerId = employee.code;
  if (relation) {
    relative.relation = relation;
  }

  // Quy tắc: Nếu là con < 11 tuổi (CHILD_U5 hoặc CHILD_5_11) -> 0 suất (ở cùng người thân)
  if (relative.relation === 'CHILD_U5' || relative.relation === 'CHILD_5_11') {
    relative.slot = 0;
  } else {
    relative.slot = 1;
  }

  let relLabel = relative.relation || 'Người thân';
  if (relative.relation === 'SPOUSE') relLabel = 'Vợ / Chồng';
  else if (relative.relation === 'CHILD_U5') relLabel = 'Con < 5 tuổi (0 suất)';
  else if (relative.relation === 'CHILD_5_11') relLabel = 'Con 5–11 tuổi (0 suất)';
  else if (relative.relation === 'CHILD_12P') relLabel = 'Con ≥ 12 tuổi (1 suất)';
  else if (relative.relation === 'PARENT') relLabel = 'Ba / Mẹ (1 suất)';

  const rooms = getRooms(tripId);
  let roomCode = '';
  let isNewRoom = false;

  // 2. Tự động tạo phòng hoặc thêm vào phòng hiện tại của nhân viên
  let targetRoom = employee.roomId ? rooms.find(r => r.id === employee.roomId) : null;

  if (targetRoom) {
    // Trường hợp A: Nhân viên đã có phòng -> Thêm người thân vào phòng hiện tại
    if (!targetRoom.memberIds.includes(relative.id)) {
      targetRoom.memberIds.push(relative.id);
    }
    relative.roomId = targetRoom.id;

    // Lấy lại danh sách thành viên đầy đủ
    const currentMembers = targetRoom.memberIds
      .map(id => (id === relative.id ? relative : people.find(p => p.id === id)!))
      .filter(Boolean);

    targetRoom.usedSlots = currentMembers.reduce((sum, m) => sum + (m.slot ?? 1), 0);
    targetRoom.childCount = currentMembers.filter(m => m.slot === 0).length;

    // Tự động nâng sức chứa phòng nếu người lớn vượt quá loại phòng hiện tại (tối đa 6)
    if (targetRoom.usedSlots > targetRoom.capacity && targetRoom.capacity < 6) {
      targetRoom.capacity = Math.min(6, targetRoom.usedSlots);
    }

    // Cập nhật loại giường thích hợp
    const hasSpouse = currentMembers.some(m => m.relation === 'SPOUSE');
    const hasChild = targetRoom.childCount > 0;
    if (hasSpouse) {
      targetRoom.bedType = 'DOUBLE';
    } else if (hasChild) {
      targetRoom.bedType = 'FAMILY';
    }

    targetRoom.status = targetRoom.usedSlots >= targetRoom.capacity ? 'FULL' : 'UNDER';
    targetRoom.updatedAt = new Date().toISOString();
    targetRoom.updatedBy = employee.name;
    roomCode = targetRoom.code;
    isNewRoom = false;
  } else {
    // Trường hợp B: Nhân viên chưa có phòng -> TỰ ĐỘNG TẠO PHÒNG 2 NGƯỜI
    isNewRoom = true;
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Tìm số phòng P.X tiếp theo bắt đầu từ 1
    const existingNums = rooms
      .map(r => {
        const match = r.code.match(/^P\.(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    roomCode = `P.${nextNum}`;

    const isChildUnder11 = relative.slot === 0;
    const usedSlots = 1 + (relative.slot ?? 1); // Nhân viên (1) + người thân (1 hoặc 0 nếu bé < 11 tuổi)
    const childCount = isChildUnder11 ? 1 : 0;

    let bedType: BedType = 'TWIN';
    if (relative.relation === 'SPOUSE') {
      bedType = 'DOUBLE';
    } else if (isChildUnder11 || relative.relation === 'CHILD_12P') {
      bedType = 'FAMILY';
    } else {
      bedType = 'DOUBLE';
    }

    const newRoom: Room = {
      id: roomId,
      tripId,
      code: roomCode,
      capacity: 2, // Mặc định phòng 2 người theo yêu cầu
      leaderId: employee.id,
      memberIds: [employee.id, relative.id],
      usedSlots,
      childCount,
      status: usedSlots >= 2 ? 'FULL' : 'UNDER',
      bedType,
      adminOverride: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: employee.name
    };

    employee.roomId = roomId;
    relative.roomId = roomId;
    rooms.push(newRoom);
  }

  saveRooms(tripId, rooms);
  savePeople(tripId, people);

  addLog(tripId, {
    id: `log_${Date.now()}`,
    tripId,
    action: isNewRoom ? 'CREATE_ROOM' : 'UPDATE_ROOM',
    actor: employee.code,
    actorName: employee.name,
    details: `${employee.name} (${employee.code}) đã nhận người thân "${relative.name}" (${relLabel}) và ${isNewRoom ? `hệ thống tự động tạo phòng ${roomCode} (2 người)` : `thêm vào phòng ${roomCode}`}`,
    timestamp: new Date().toISOString()
  });

  return {
    success: true,
    roomCode,
    isNewRoom,
    message: isNewRoom 
      ? `Đã nhận người thân và tự động tạo phòng ${roomCode} (Phòng 2 người)` 
      : `Đã nhận người thân và thêm vào phòng ${roomCode}`
  };
}

/**
 * Hủy nhận người thân
 */
export function unclaimRelative(
  tripId: string, 
  employeeCodeOrId: string, 
  relativeId: string
): { success: boolean; message: string } {
  const targetTripId = tripId || getActiveTripId();
  const people = getPeople(targetTripId);

  // Tìm relative bằng ID hoặc Code (linh hoạt cả hai)
  const relative = people.find(p => 
    (p.id === relativeId || p.code === relativeId) && 
    (p.type === 'RELATIVE' || p.type === 'PG')
  );

  if (!relative) {
    return { success: false, message: 'Không tìm thấy người thân cần hủy nhận.' };
  }

  const relName = relative.name;

  // Gỡ liên kết người thân
  relative.ownerId = null;
  relative.relation = null;
  relative.slot = 1;

  // Nếu người thân đang ở trong phòng nào, tự động gỡ ra khỏi phòng đó
  const relRoomId = relative.roomId;
  relative.roomId = null;

  if (relRoomId) {
    const rooms = getRooms(targetTripId);
    const room = rooms.find(r => r.id === relRoomId);
    if (room) {
      room.memberIds = room.memberIds.filter(id => id !== relative.id && id !== relativeId);
      const remainingMembers = room.memberIds
        .map(id => people.find(p => p.id === id)!)
        .filter(Boolean);
      room.usedSlots = remainingMembers.reduce((sum, m) => sum + (m.slot ?? 1), 0);
      room.childCount = remainingMembers.filter(m => m.slot === 0).length;
      room.status = room.usedSlots >= room.capacity ? 'FULL' : 'UNDER';
      room.updatedAt = new Date().toISOString();
      saveRooms(targetTripId, rooms);
    }
  }

  savePeople(targetTripId, people);

  addLog(targetTripId, {
    id: `log_${Date.now()}`,
    tripId: targetTripId,
    action: 'ASSIGN_RELATIVE',
    actor: employeeCodeOrId,
    actorName: employeeCodeOrId,
    details: `Đã hủy nhận người thân "${relName}"`,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: `Đã hủy nhận người thân "${relName}" thành công.` };
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
