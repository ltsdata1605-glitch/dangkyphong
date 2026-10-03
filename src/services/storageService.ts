import { Person, Room, RoomStatus, Trip, AuditLog, RelationType, BedType } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { validateRoom } from './roomingEngine';

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
let currentListeningTripId: string | null = null;

/**
 * Lắng nghe và đồng bộ dữ liệu Real-time từ Firebase Firestore
 */
export function setupFirestoreListeners(tripId: string): void {
  // Hủy các listener cũ của chuyến đi trước (nếu đổi chuyến đi)
  if (peopleUnsub) { peopleUnsub(); peopleUnsub = null; }
  if (roomsUnsub) { roomsUnsub(); roomsUnsub = null; }
  if (logsUnsub) { logsUnsub(); logsUnsub = null; }
  currentListeningTripId = tripId;

  // 1. Lắng nghe danh sách tất cả các chuyến đi
  if (!tripsListUnsub) {
    try {
      tripsListUnsub = onSnapshot(doc(db, 'system', 'trips'), (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.trips)) {
            localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(data.trips));
            // Đảm bảo active trip được kích hoạt listener chính xác
            let activeId = getActiveTripId();
            if (!activeId || !data.trips.some((t: Trip) => t.id === activeId)) {
              if (data.trips.length > 0) {
                activeId = data.trips[0].id;
                setActiveTripId(activeId);
              }
            } else if (currentListeningTripId !== activeId) {
              setupFirestoreListeners(activeId);
            }
            notifyStateChange();
          }
        }
      }, (err) => {
        console.warn('[Firebase Firestore] trips sync warning (offline or permissions):', err);
      });
    } catch (err) {
      console.warn('[Firebase] Init trips listener error:', err);
    }
  }

  if (!tripId) return;

  // 2. Lắng nghe danh sách nhân sự của chuyến đi hiện tại
  try {
    peopleUnsub = onSnapshot(doc(db, 'trips', tripId, 'data', 'people'), (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return;
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.people)) {
          const currentRooms = getRooms(tripId);
          const { rooms: cleanRooms, people: cleanPeople, modified } = reconcileRoomsAndPeople(tripId, currentRooms, data.people);
          localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(cleanPeople));
          if (modified) {
            localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(cleanRooms));
          }
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
      if (snapshot.metadata.hasPendingWrites) return;
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.rooms)) {
          const currentPeople = getPeople(tripId);
          const { rooms: cleanRooms, people: cleanPeople, modified } = reconcileRoomsAndPeople(tripId, data.rooms, currentPeople);
          const { rooms: normalized } = migrateRoomCodes(cleanRooms);
          localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(normalized));
          if (modified) {
            localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(cleanPeople));
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
      if (snapshot.metadata.hasPendingWrites) return;
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.logs)) {
          const cleanLogs = data.logs.filter((l: AuditLog) => !l.id.startsWith('log_init_'));
          localStorage.setItem(`${STORAGE_KEYS.LOGS_PREFIX}${tripId}`, JSON.stringify(cleanLogs));
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
 * Đẩy dữ liệu nhân sự lên Firebase (merge an toàn với Firestore để tránh ghi đè dữ liệu người khác)
 */
export async function syncPeopleToFirebase(tripId: string, people: Person[]): Promise<void> {
  try {
    const peopleDocRef = doc(db, 'trips', tripId, 'data', 'people');
    let finalPeople = people;
    try {
      const snap = await getDoc(peopleDocRef);
      if (snap.exists()) {
        const remoteData = snap.data();
        if (remoteData && Array.isArray(remoteData.people)) {
          const peopleMap = new Map<string, Person>();
          remoteData.people.forEach((p: Person) => peopleMap.set(p.id, p));
          people.forEach(p => {
            const remote = peopleMap.get(p.id);
            if (remote) {
              peopleMap.set(p.id, {
                ...remote,
                ...p,
                ownerId: p.ownerId !== undefined ? p.ownerId : remote.ownerId,
                relation: p.relation !== undefined ? p.relation : remote.relation,
                roomId: p.roomId !== undefined ? p.roomId : remote.roomId
              });
            } else {
              peopleMap.set(p.id, p);
            }
          });
          finalPeople = Array.from(peopleMap.values());
        }
      }
    } catch (e) {
      console.warn('[Firebase] Lỗi đọc people trước khi merge:', e);
    }

    await setDoc(peopleDocRef, {
      people: finalPeople,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Firebase] Ghi dữ liệu nhân sự lỗi:', err);
  }
}

/**
 * Đẩy dữ liệu phòng lên Firebase (merge an toàn với Firestore)
 */
export async function syncRoomsToFirebase(tripId: string, rooms: Room[], isExplicitDeletion = false): Promise<void> {
  try {
    const roomDocRef = doc(db, 'trips', tripId, 'data', 'rooms');
    let finalRooms = rooms;

    if (!isExplicitDeletion) {
      try {
        const snap = await getDoc(roomDocRef);
        if (snap.exists()) {
          const remoteData = snap.data();
          if (remoteData && Array.isArray(remoteData.rooms)) {
            const roomMap = new Map<string, Room>();
            remoteData.rooms.forEach((r: Room) => roomMap.set(r.id, r));
            rooms.forEach(r => roomMap.set(r.id, r));
            finalRooms = Array.from(roomMap.values());
          }
        }
      } catch (e) {
        console.warn('[Firebase] Lỗi đọc rooms trước khi merge:', e);
      }
    }

    // Đảm bảo không trùng mã phòng và chuẩn hóa số phòng P.1, P.2, P.3...
    const usedCodes = new Set<string>();
    finalRooms.forEach((r, idx) => {
      if (!r.code || usedCodes.has(r.code)) {
        let n = idx + 1;
        while (usedCodes.has(`P.${n}`)) n++;
        r.code = `P.${n}`;
      }
      usedCodes.add(r.code);
    });

    await setDoc(roomDocRef, {
      rooms: finalRooms,
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
  // Chỉ chèn DEFAULT_TRIP nếu key TRIPS chưa từng tồn tại trong localStorage (lần đầu truy cập app mới)
  const tripsRaw = localStorage.getItem(STORAGE_KEYS.TRIPS);
  let trips = getTrips();
  if (tripsRaw === null && trips.length === 0) {
    trips = [DEFAULT_TRIP];
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  }

  // 2. Kiểm tra chuyến đi active
  let activeTripId = getActiveTripId();
  if (!activeTripId || !trips.some(t => t.id === activeTripId)) {
    if (trips.length > 0) {
      activeTripId = trips[0].id;
      setActiveTripId(activeTripId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP);
      activeTripId = '';
    }
  }

  // KHÔNG tự động nạp dữ liệu mẫu. Hệ thống hoàn toàn làm việc trên dữ liệu thực tế do Admin thiết lập hoặc đồng bộ từ Firebase.

  // 3. Kích hoạt Firebase Realtime Listener
  setupFirestoreListeners(activeTripId || '');

  // 4. Chuẩn hóa số phòng bắt đầu từ 1 cho tất cả các chuyến đi
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

export async function saveTrip(trip: Trip): Promise<void> {
  const trips = getTrips();
  const index = trips.findIndex(t => t.id === trip.id);
  if (index >= 0) {
    trips[index] = trip;
  } else {
    trips.unshift(trip);
  }
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  notifyStateChange();
  await syncTripsToFirebase();
}

export async function deleteTrip(tripId: string): Promise<void> {
  let trips = getTrips();
  trips = trips.filter(t => t.id !== tripId);
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));

  localStorage.removeItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`);
  localStorage.removeItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`);
  localStorage.removeItem(`${STORAGE_KEYS.LOGS_PREFIX}${tripId}`);

  // Cập nhật danh sách chuyến đi lên Firebase
  await syncTripsToFirebase();

  // Xóa sạch các tài liệu con của trip này trên Firestore
  try {
    await deleteDoc(doc(db, 'trips', tripId, 'data', 'people'));
    await deleteDoc(doc(db, 'trips', tripId, 'data', 'rooms'));
    await deleteDoc(doc(db, 'trips', tripId, 'data', 'logs'));
    await deleteDoc(doc(db, 'trips', tripId));
  } catch (err) {
    console.warn('[Firebase] Lỗi xóa dữ liệu Firestore của chuyến đi:', err);
  }

  if (getActiveTripId() === tripId) {
    if (trips.length > 0) {
      setActiveTripId(trips[0].id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP);
    }
  }
  notifyStateChange();
}

export function getActiveTripId(): string {
  const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP);
  if (saved) return saved;
  const trips = getTrips();
  return trips.length > 0 ? trips[0].id : '';
}

export function setActiveTripId(tripId: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP, tripId);
  setupFirestoreListeners(tripId);
  notifyStateChange();
}

export function getActiveTrip(): Trip | null {
  const trips = getTrips();
  const activeId = getActiveTripId();
  const found = trips.find(t => t.id === activeId);
  if (found) return found;
  if (trips.length > 0) return trips[0];
  return null;
}

export function getPeople(tripId: string): Person[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function savePeople(tripId: string, people: Person[]): Promise<void> {
  localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(people));
  notifyStateChange();
  await syncPeopleToFirebase(tripId, people);
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

/**
 * Tự động hàn gắn và đồng bộ 2 chiều giữa Rooms và People:
 * - Phòng (rooms) là nguồn dữ liệu chuẩn về việc ai ở phòng nào (memberIds).
 * - Tự động cập nhật person.roomId cho các thành viên trong phòng.
 * - Chỉ gỡ thành viên nếu thành viên đó không tồn tại trong danh sách people.
 * - Tuyệt đối KHÔNG xóa phòng nếu phòng vẫn còn thành viên hợp lệ.
 */
export function reconcileRoomsAndPeople(tripId: string, rooms: Room[], people: Person[]): { rooms: Room[], people: Person[], modified: boolean } {
  let modified = false;
  if (!rooms) rooms = [];
  if (!people) people = [];

  const peopleMap = new Map<string, Person>();
  people.forEach(p => {
    peopleMap.set(p.id, p);
    peopleMap.set(p.code, p);
  });

  const updatedRooms: Room[] = [];
  const assignedPersonIds = new Set<string>();

  // 1. Duyệt qua tất cả các phòng hiện có:
  rooms.forEach(room => {
    // Lấy danh sách thành viên thực tế có trong danh sách nhân sự
    const validMembers: Person[] = [];
    room.memberIds.forEach(mId => {
      const p = peopleMap.get(mId);
      if (p && !validMembers.some(vm => vm.id === p.id)) {
        validMembers.push(p);
      }
    });

    // Nếu phòng hoàn toàn không có thành viên nào -> bỏ qua phòng trống này
    if (validMembers.length === 0) {
      modified = true;
      return;
    }

    const cleanMemberIds = validMembers.map(m => m.id);
    cleanMemberIds.forEach(id => assignedPersonIds.add(id));

    // Đảm bảo tất cả thành viên trong phòng có roomId trỏ đúng về phòng này
    validMembers.forEach(p => {
      if (p.roomId !== room.id) {
        p.roomId = room.id;
        modified = true;
      }
    });

    const usedSlots = validMembers.reduce((sum, m) => sum + (m.slot ?? 1), 0);
    const childCount = validMembers.filter(m => m.slot === 0).length;

    let leaderId = room.leaderId;
    if (!cleanMemberIds.includes(leaderId)) {
      const emp = validMembers.find(m => m.type === 'EMPLOYEE');
      leaderId = emp ? emp.id : cleanMemberIds[0];
      modified = true;
    }

    updatedRooms.push({
      ...room,
      memberIds: cleanMemberIds,
      leaderId,
      usedSlots,
      childCount,
      status: (usedSlots >= room.capacity ? 'FULL' : 'UNDER') as RoomStatus
    });
  });

  const validRoomIds = new Set(updatedRooms.map(r => r.id));

  // 2. Chuẩn hóa People:
  // Nếu một người có p.roomId trỏ đến phòng không tồn tại hoặc không nằm trong danh sách phòng hợp lệ -> gỡ roomId
  people.forEach(p => {
    if (p.roomId) {
      if (!validRoomIds.has(p.roomId) || !assignedPersonIds.has(p.id)) {
        p.roomId = null;
        modified = true;
      }
    }
  });

  return { rooms: updatedRooms, people, modified };
}

let isNormalizing = false;

/**
 * Chuẩn hóa số lượng thành viên tối đa 6 người/phòng và tự động cập nhật loại phòng phù hợp nếu vượt quá ban đầu
 */
export function normalizeRoomCapacitiesAndLimits(tripId: string, rooms: Room[], persistPeople = false): { rooms: Room[], modified: boolean } {
  if (isNormalizing || !rooms || rooms.length === 0) return { rooms, modified: false };
  isNormalizing = true;
  try {
    let modified = false;
    const people = getPeople(tripId);
    const peopleMap = new Map(people.map(p => [p.id, p]));

    const updatedRooms = rooms.map(room => {
      let roomModified = false;
      let memberIds = [...room.memberIds];

      // 1. Giới hạn tối đa 6 người/phòng: Nếu vượt quá 6 người, tách các thành viên dư ra ngoài
      if (memberIds.length > 6) {
        const extraMemberIds = memberIds.slice(6);
        memberIds = memberIds.slice(0, 6);
        extraMemberIds.forEach(mId => {
          const p = peopleMap.get(mId) || people.find(item => item.code === mId);
          if (p) {
            p.roomId = null;
          }
        });
        roomModified = true;
        modified = true;
      }

      // 2. Tự động đổi loại phòng nếu số người lớn vượt quá sức chứa ban đầu (tối đa 6)
      const members = memberIds.map(mId => peopleMap.get(mId) || people.find(item => item.code === mId)).filter(Boolean) as Person[];
      const adultSlots = members.filter(m => m.slot > 0).length;
      let capacity = room.capacity;
      if (adultSlots > capacity) {
        capacity = Math.min(6, adultSlots);
        roomModified = true;
        modified = true;
      }

      if (roomModified) {
        const validation = validateRoom(members, capacity, 2, room.adminOverride);
        return {
          ...room,
          memberIds,
          capacity,
          usedSlots: validation.usedSlots,
          childCount: validation.childCount,
          status: (validation.usedSlots === capacity ? 'FULL' : (validation.usedSlots < capacity ? 'UNDER' : 'WARNING')) as RoomStatus,
          bedType: validation.bedType,
          updatedAt: room.updatedAt || new Date().toISOString()
        };
      }

      return room;
    });

    if (modified && persistPeople) {
      localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(people));
      syncPeopleToFirebase(tripId, people);
    }

    return { rooms: updatedRooms, modified };
  } finally {
    isNormalizing = false;
  }
}

export function getRooms(tripId: string): Room[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`);
    const rooms: Room[] = raw ? JSON.parse(raw) : [];
    const { rooms: normalizedCodes, migrated: migratedCodes } = migrateRoomCodes(rooms);
    const { rooms: finalRooms, modified: modifiedLimits } = normalizeRoomCapacitiesAndLimits(tripId, normalizedCodes, false);
    if (migratedCodes || modifiedLimits) {
      localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(finalRooms));
      syncRoomsToFirebase(tripId, finalRooms);
    }
    return finalRooms;
  } catch {
    return [];
  }
}

export async function saveRooms(tripId: string, rooms: Room[], isExplicitDeletion = false): Promise<void> {
  const { rooms: normalizedCodes } = migrateRoomCodes(rooms);
  const { rooms: finalRooms } = normalizeRoomCapacitiesAndLimits(tripId, normalizedCodes, true);
  localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(finalRooms));
  notifyStateChange();
  await syncRoomsToFirebase(tripId, finalRooms, isExplicitDeletion);
}

export function getLogs(tripId: string): AuditLog[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.LOGS_PREFIX}${tripId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(l => !l.id.startsWith('log_init_'));
  } catch {
    return [];
  }
}

export function addLog(tripId: string, log: AuditLog): void {
  const logs = getLogs(tripId).filter(l => !l.id.startsWith('log_init_'));
  logs.unshift(log);
  localStorage.setItem(`${STORAGE_KEYS.LOGS_PREFIX}${tripId}`, JSON.stringify(logs.slice(0, 300)));
  syncLogsToFirebase(tripId);
  notifyStateChange();
}

/**
 * Lấy thông tin thời gian nhập và số người đã nhập cho chuyến đi
 */
export function getTripImportInfo(trip: Trip): { count: number; importedAt: string } | null {
  if (trip.lastImportedAt && trip.lastImportedCount !== undefined && trip.lastImportedCount > 0) {
    return { count: trip.lastImportedCount, importedAt: trip.lastImportedAt };
  }
  const logs = getLogs(trip.id);
  const importLog = logs.find(l => l.action === 'IMPORT_EXCEL');
  const people = getPeople(trip.id);
  if (importLog && people.length > 0) {
    return { count: people.length, importedAt: importLog.timestamp };
  }
  if (people.length > 0) {
    return { count: people.length, importedAt: trip.createdAt };
  }
  return null;
}

/**
 * Gán / Nhận người thân vào nhân viên bảo trợ (cho phép chọn mối quan hệ)
 * TỰ ĐỘNG TẠO PHÒNG VỚI NGƯỜI THÂN:
 * - Nếu là Vợ/Chồng, Con -> Mặc định tạo phòng 2 người (capacity = 2).
 *   Riêng đối với con < 11 tuổi (CHILD_U5, CHILD_5_11) thì ở cùng người thân, slot = 0 (không tính là 1 người).
 * - Nếu nhân viên đã có phòng: Tự động thêm người thân vào phòng hiện tại.
 */
export async function claimRelative(
  tripId: string, 
  employeeCode: string, 
  relativeId: string, 
  employeeName?: string,
  relation?: RelationType
): Promise<{ success: boolean; roomCode?: string; isNewRoom?: boolean; message?: string }> {
  const people = getPeople(tripId);
  const employee = people.find(p => p.code === employeeCode && p.type === 'EMPLOYEE');
  const relative = people.find(p => p.id === relativeId || p.code === relativeId);

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
  let autoCapacity = 2;

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
    // Trường hợp B: Nhân viên chưa có phòng -> TỰ ĐỘNG TẠO PHÒNG MỚI (Tự động chuyển loại phòng nếu phòng 2 người đã đầy)
    isNewRoom = true;

    // Kiểm tra định mức phòng
    const currentTrip = getTrips().find(t => t.id === tripId);
    if (currentTrip?.roomLimits) {
      const counts: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      rooms.forEach(r => {
        if (counts[r.capacity] !== undefined) counts[r.capacity]++;
      });

      // Nếu phòng 2 người đã đầy, tự động chuyển sang loại phòng còn chỉ tiêu (2 -> 3 -> 4 -> 5 -> 6)
      let foundCap: number | null = null;
      for (let c = 2; c <= 6; c++) {
        const lim = currentTrip.roomLimits[c];
        if (lim === undefined || (counts[c] || 0) < lim) {
          foundCap = c;
          break;
        }
      }
      if (foundCap === null) {
        return {
          success: false,
          message: 'Khách sạn đã hết tất cả các loại phòng theo định mức. Không thể mở thêm phòng mới.'
        };
      }
      autoCapacity = foundCap;
    }

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
      capacity: autoCapacity,
      leaderId: employee.id,
      memberIds: [employee.id, relative.id],
      usedSlots,
      childCount,
      status: usedSlots >= autoCapacity ? 'FULL' : 'UNDER',
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

  const { rooms: cleanRooms, people: cleanPeople } = reconcileRoomsAndPeople(tripId, rooms, people);
  localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(cleanRooms));
  localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(cleanPeople));
  notifyStateChange();

  await Promise.all([
    syncRoomsToFirebase(tripId, cleanRooms),
    syncPeopleToFirebase(tripId, cleanPeople)
  ]);

  addLog(tripId, {
    id: `log_${Date.now()}`,
    tripId,
    action: isNewRoom ? 'CREATE_ROOM' : 'UPDATE_ROOM',
    actor: employee.code,
    actorName: employee.name,
    details: `${employee.name} (${employee.code}) đã nhận người thân "${relative.name}" (${relLabel}) và ${isNewRoom ? `hệ thống tự động tạo phòng ${roomCode} (${autoCapacity} người)` : `thêm vào phòng ${roomCode}`}`,
    timestamp: new Date().toISOString()
  });

  return {
    success: true,
    roomCode,
    isNewRoom,
    message: isNewRoom 
      ? `Đã nhận người thân và tự động tạo phòng ${roomCode} (Phòng ${autoCapacity} người${autoCapacity > 2 ? ' do phòng 2 người đã đủ số lượng' : ''})` 
      : `Đã nhận người thân và thêm vào phòng ${roomCode}`
  };
}

/**
 * Hủy nhận người thân
 */
export async function unclaimRelative(
  tripId: string, 
  employeeCodeOrId: string, 
  relativeId: string
): Promise<{ success: boolean; message: string }> {
  const targetTripId = tripId || getActiveTripId();
  const people = getPeople(targetTripId);

  // Tìm relative bằng ID hoặc Code (linh hoạt cả hai)
  const relative = people.find(p => 
    (p.id === relativeId || p.code === relativeId)
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

  const rooms = getRooms(targetTripId);
  if (relRoomId) {
    const room = rooms.find(r => r.id === relRoomId);
    if (room) {
      room.memberIds = room.memberIds.filter(id => id !== relative.id && id !== relativeId);
    }
  }

  const { rooms: cleanRooms, people: cleanPeople } = reconcileRoomsAndPeople(targetTripId, rooms, people);
  localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${targetTripId}`, JSON.stringify(cleanRooms));
  localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${targetTripId}`, JSON.stringify(cleanPeople));
  notifyStateChange();

  await Promise.all([
    syncRoomsToFirebase(targetTripId, cleanRooms),
    syncPeopleToFirebase(targetTripId, cleanPeople)
  ]);

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
export async function assignRelativeAdmin(tripId: string, employeeCode: string, relativeId: string): Promise<boolean> {
  const people = getPeople(tripId);
  const employee = people.find(p => p.code === employeeCode && p.type === 'EMPLOYEE');
  const relative = people.find(p => p.id === relativeId && p.type === 'RELATIVE');

  if (!employee || !relative) return false;

  relative.ownerId = employee.code;

  const rooms = getRooms(tripId);
  if (employee.roomId) {
    const room = rooms.find(r => r.id === employee.roomId);
    if (room && !room.memberIds.includes(relative.id)) {
      room.memberIds.push(relative.id);
      relative.roomId = room.id;
    }
  }

  const { rooms: cleanRooms, people: cleanPeople } = reconcileRoomsAndPeople(tripId, rooms, people);
  localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(cleanRooms));
  localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(cleanPeople));
  notifyStateChange();

  await Promise.all([
    syncRoomsToFirebase(tripId, cleanRooms),
    syncPeopleToFirebase(tripId, cleanPeople)
  ]);

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
 * Rời khỏi phòng (hoặc Admin gỡ thành viên khỏi phòng)
 */
export async function leaveRoom(
  tripId: string,
  personId: string,
  actorId: string,
  actorName: string,
  targetRoomId?: string
): Promise<{ success: boolean; message: string }> {
  const people = getPeople(tripId);
  const rooms = getRooms(tripId);
  const person = people.find(p => p.id === personId || p.code === personId);

  // Tìm phòng: Ưu tiên targetRoomId nếu có, hoặc person.roomId, hoặc tìm phòng chứa personId / code trong memberIds
  let roomIndex = -1;
  if (targetRoomId) {
    roomIndex = rooms.findIndex(r => r.id === targetRoomId);
  }
  if (roomIndex < 0 && person?.roomId) {
    roomIndex = rooms.findIndex(r => r.id === person.roomId);
  }
  if (roomIndex < 0) {
    roomIndex = rooms.findIndex(r =>
      r.memberIds.includes(personId) ||
      (person && (r.memberIds.includes(person.id) || r.memberIds.includes(person.code)))
    );
  }

  if (roomIndex < 0) {
    if (person) {
      person.roomId = null;
      await savePeople(tripId, people);
    }
    return { success: false, message: 'Người này chưa có trong phòng nào.' };
  }

  const room = rooms[roomIndex];
  const idsToRemove = new Set<string>([personId]);
  if (person) {
    idsToRemove.add(person.id);
    idsToRemove.add(person.code);
  }

  const remainingMemberIds = room.memberIds.filter(id => !idsToRemove.has(id));

  // Nếu phòng không còn ai sau khi người này rời đi -> Xóa phòng hoàn toàn
  if (remainingMemberIds.length === 0) {
    rooms.splice(roomIndex, 1);
    if (person) person.roomId = null;

    const { rooms: cleanRooms, people: cleanPeople } = reconcileRoomsAndPeople(tripId, rooms, people);
    localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(cleanRooms));
    localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(cleanPeople));
    notifyStateChange();

    await Promise.all([
      syncRoomsToFirebase(tripId, cleanRooms),
      syncPeopleToFirebase(tripId, cleanPeople)
    ]);

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

  const remainingMembers = remainingMemberIds
    .map(id => people.find(p => p.id === id || p.code === id)!)
    .filter(Boolean);

  // Kiểm tra xem còn nhân viên nào trong phòng không
  const nextEmployee = remainingMembers.find(m => m.type === 'EMPLOYEE');
  if (!nextEmployee) {
    // Không còn nhân viên nào (chỉ còn trẻ em/người thân), giải tán toàn bộ phòng
    rooms.splice(roomIndex, 1);
    room.memberIds.forEach(mId => {
      const p = people.find(item => item.id === mId || item.code === mId);
      if (p) p.roomId = null;
    });
    if (person) person.roomId = null;

    const { rooms: cleanRooms, people: cleanPeople } = reconcileRoomsAndPeople(tripId, rooms, people);
    localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(cleanRooms));
    localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(cleanPeople));
    notifyStateChange();

    await Promise.all([
      syncRoomsToFirebase(tripId, cleanRooms, true),
      syncPeopleToFirebase(tripId, cleanPeople)
    ]);

    return { success: true, message: 'Đã giải tán phòng do không còn nhân viên nào trong phòng.' };
  }

  // Nếu người rời phòng là trưởng phòng thì chuyển quyền cho nhân viên tiếp theo
  if (idsToRemove.has(room.leaderId)) {
    room.leaderId = nextEmployee.id;
  }

  room.memberIds = remainingMemberIds;
  if (person) person.roomId = null;

  // Nếu người này có trẻ em đi kèm, cũng đưa trẻ em ra khỏi phòng
  if (person) {
    const childrenOfThisPerson = remainingMembers.filter(m => m.slot === 0 && m.ownerId === person.code);
    for (const child of childrenOfThisPerson) {
      room.memberIds = room.memberIds.filter(id => id !== child.id && id !== child.code);
      child.roomId = null;
    }
  }

  // Sau khi đưa trẻ em ra, kiểm tra lại nếu không còn ai
  if (room.memberIds.length === 0) {
    rooms.splice(roomIndex, 1);
    const { rooms: cleanRooms, people: cleanPeople } = reconcileRoomsAndPeople(tripId, rooms, people);
    localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(cleanRooms));
    localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(cleanPeople));
    notifyStateChange();

    await Promise.all([
      syncRoomsToFirebase(tripId, cleanRooms, true),
      syncPeopleToFirebase(tripId, cleanPeople)
    ]);
    return { success: true, message: 'Đã giải tán phòng.' };
  }

  const finalMembers = room.memberIds
    .map(id => people.find(p => p.id === id || p.code === id)!)
    .filter(Boolean);

  room.usedSlots = finalMembers.reduce((sum, m) => sum + (m.slot || 0), 0);
  room.childCount = finalMembers.filter(m => m.slot === 0).length;
  room.status = room.usedSlots === room.capacity ? 'FULL' : 'UNDER';
  room.updatedAt = new Date().toISOString();
  room.updatedBy = actorName;

  const { rooms: cleanRooms, people: cleanPeople } = reconcileRoomsAndPeople(tripId, rooms, people);
  localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(cleanRooms));
  localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(cleanPeople));
  notifyStateChange();

  await Promise.all([
    syncRoomsToFirebase(tripId, cleanRooms),
    syncPeopleToFirebase(tripId, cleanPeople)
  ]);

  addLog(tripId, {
    id: `log_${Date.now()}`,
    tripId,
    action: 'LEAVE_ROOM',
    actor: actorId,
    actorName,
    details: `${person?.name || personId} đã rời khỏi phòng ${room.code}`,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: `Đã rời phòng ${room.code}.` };
}

/**
 * Xóa phòng hoàn toàn (Admin hoặc Trưởng phòng hủy)
 */
export async function deleteRoom(tripId: string, roomId: string, actorId: string, actorName: string): Promise<boolean> {
  const people = getPeople(tripId);
  const rooms = getRooms(tripId);
  const room = rooms.find(r => r.id === roomId);

  if (!room) return false;

  const memberSet = new Set(room.memberIds || []);

  people.forEach(p => {
    if (p.roomId === roomId || memberSet.has(p.id) || memberSet.has(p.code)) {
      p.roomId = null;
    }
  });

  const updatedRooms = rooms.filter(r => r.id !== roomId);
  const { rooms: cleanRooms, people: cleanPeople } = reconcileRoomsAndPeople(tripId, updatedRooms, people);

  localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify(cleanRooms));
  localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(cleanPeople));
  notifyStateChange();

  await Promise.all([
    syncRoomsToFirebase(tripId, cleanRooms, true),
    syncPeopleToFirebase(tripId, cleanPeople)
  ]);

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
export async function deleteAllRooms(tripId: string, actorId: string, actorName: string): Promise<boolean> {
  const people = getPeople(tripId);
  people.forEach(p => {
    p.roomId = null;
  });

  localStorage.setItem(`${STORAGE_KEYS.ROOMS_PREFIX}${tripId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.PEOPLE_PREFIX}${tripId}`, JSON.stringify(people));
  notifyStateChange();

  await Promise.all([
    syncRoomsToFirebase(tripId, [], true),
    syncPeopleToFirebase(tripId, people)
  ]);

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
 * Khôi phục dữ liệu ban đầu cho chuyến đi (xóa phòng, đặt lại trạng thái nhân sự hiện tại)
 */
export async function resetDefaultData(tripId: string): Promise<void> {
  const currentPeople = getPeople(tripId);
  const resetPeople: Person[] = currentPeople.map(p => ({
    ...p,
    roomId: null
  }));
  await savePeople(tripId, resetPeople);
  await saveRooms(tripId, [], true);
  addLog(tripId, {
    id: `log_${Date.now()}`,
    tripId,
    action: 'DELETE_ROOM',
    actor: 'admin',
    actorName: 'Ban Tổ Chức',
    details: `Đã đặt lại dữ liệu chuyến đi: xóa toàn bộ phòng và đưa tất cả ${resetPeople.length} nhân sự về trạng thái chưa xếp phòng`,
    timestamp: new Date().toISOString()
  });
}

// Event Dispatcher for cross-component re-renders
const listeners = new Set<() => void>();

export function subscribeToStateChanges(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

let isNotifying = false;
let hasPendingNotification = false;

function notifyStateChange(): void {
  if (isNotifying) {
    hasPendingNotification = true;
    return;
  }
  isNotifying = true;
  try {
    listeners.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    });
  } finally {
    isNotifying = false;
    if (hasPendingNotification) {
      hasPendingNotification = false;
      notifyStateChange();
    }
  }
}
