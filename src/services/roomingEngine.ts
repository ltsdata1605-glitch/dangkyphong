import { Person, Room, RuleValidationResult, BedType } from '../types';

/**
 * Kiểm tra tính hợp lệ của một phòng theo tất cả các Business Rules (R1 -> R9)
 */
export function validateRoom(
  members: Person[],
  capacity: number,
  maxChildrenPerRoom = 2,
  isAdminOverride = false
): RuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (members.length === 0) {
    return {
      valid: false,
      errors: ['Phòng phải có ít nhất 1 thành viên.'],
      warnings: [],
      bedType: 'TWIN',
      usedSlots: 0,
      childCount: 0
    };
  }

  // 1. Phân loại người lớn và trẻ em
  const adults = members.filter(m => m.slot > 0);
  const children = members.filter(m => m.slot === 0);
  const usedSlots = adults.length;
  const childCount = children.length;

  // Giới hạn cứng: Mỗi phòng chỉ tối đa 6 người
  if (members.length > 6 || usedSlots > 6) {
    errors.push(`Số lượng người (${members.length}) vượt quá giới hạn tối đa 6 người/phòng.`);
  }

  // R7: Tổng suất người lớn không vượt quá loại phòng đã chọn
  if (usedSlots > capacity) {
    errors.push(`Tổng số suất người lớn (${usedSlots}) vượt quá sức chứa phòng ${capacity} người.`);
  }

  // R8: Tổng suất ít hơn loại phòng -> Cảnh báo thiếu người (vẫn cho lưu)
  if (usedSlots < capacity) {
    warnings.push(`Phòng đang thiếu người: ${usedSlots}/${capacity} suất.`);
  }

  // Cảnh báo số lượng trẻ em ở ghép vượt giới hạn
  if (childCount > maxChildrenPerRoom) {
    warnings.push(`Số trẻ em ở ghép (${childCount}) vượt mức quy định (${maxChildrenPerRoom} trẻ/phòng). Khách sạn có thể tính phụ thu giường phụ.`);
  }

  // Phân tích giới tính người lớn
  const maleAdults = adults.filter(a => a.gender === 'M');
  const femaleAdults = adults.filter(a => a.gender === 'F');
  const isMixedGender = maleAdults.length > 0 && femaleAdults.length > 0;

  // Tìm danh sách nhân viên chính trong phòng
  const employeesInRoom = members.filter(m => m.type === 'EMPLOYEE');
  const employeeCodes = new Set(employeesInRoom.map(e => e.code));

  // R5: Trẻ em < 12 tuổi phải ở cùng phòng với nhân viên (cha/mẹ) bảo trợ của mình
  for (const child of children) {
    if (child.ownerId && !employeeCodes.has(child.ownerId)) {
      const parentName = child.ownerId;
      errors.push(`Trẻ em "${child.name}" bắt buộc phải ở cùng phòng với cha/mẹ (MSNV: ${parentName}).`);
    }
  }

  // R9: PG theo quy tắc cùng giới, không được hưởng ngoại lệ gia đình
  const pgMembers = members.filter(m => m.type === 'PG');
  if (pgMembers.length > 0 && isMixedGender) {
    errors.push('PG tham gia độc lập phải tuân thủ quy tắc cùng giới tính (không áp dụng ngoại lệ gia đình).');
  }

  // R1 & R2: Quy tắc Nam/Nữ và Ngoại lệ Gia đình
  if (isMixedGender) {
    // Để được ở chung khác giới:
    // Điều kiện A: Tất cả thành viên trong phòng phải thuộc đúng 1 gia đình duy nhất
    // (tức là chỉ có tối đa 1 nhân viên, và tất cả người thân đều có ownerId là nhân viên đó).
    // Điều kiện B: Hoặc cả 2 người lớn là 2 nhân viên là vợ chồng (Admin đánh dấu override).

    let isStrictSingleFamily = false;

    if (employeesInRoom.length === 1) {
      const primaryEmployee = employeesInRoom[0];
      const nonPrimaryMembers = members.filter(m => m.id !== primaryEmployee.id);
      const allRelativesOfThisEmployee = nonPrimaryMembers.every(
        m => m.type === 'RELATIVE' && (m.ownerId === primaryEmployee.code || !m.ownerId)
      );

      if (allRelativesOfThisEmployee) {
        isStrictSingleFamily = true;
      }
    }

    if (!isStrictSingleFamily && !isAdminOverride) {
      warnings.push(
        '✕ CẢNH BÁO QUY ĐỊNH CÔNG TY: Nghiêm cấm Nam và Nữ ở cùng phòng nếu không phải là quan hệ Vợ Chồng hoặc người thân ruột thịt. Người đăng ký hoàn toàn chịu trách nhiệm kỷ luật nếu khai báo không trung thực.'
      );
    }
  }

  // Xác định kiểu giường gợi ý (Bed Type Suggestion)
  let bedType: BedType = 'TWIN';
  const hasSpouse = members.some(m => m.relation === 'SPOUSE');
  const hasChild = childCount > 0;

  if ((hasSpouse || isMixedGender) && adults.length === 2) {
    bedType = 'DOUBLE';
  } else if (hasChild && adults.length <= 2) {
    bedType = 'FAMILY';
  } else if (adults.length === 2 && !isMixedGender) {
    bedType = 'TWIN';
  } else if (adults.length === 3) {
    bedType = 'TRIPLE';
  } else if (adults.length > 3) {
    bedType = 'FAMILY';
  }

  const valid = isAdminOverride ? true : errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    bedType,
    usedSlots,
    childCount
  };
}

/**
 * Kiểm tra xem người B có thể thêm vào phòng của người A hay không
 * Trả về: { allowed: boolean, reason?: string, warning?: string }
 */
export function canAddPersonToRoom(
  targetPerson: Person,
  currentMembers: Person[],
  capacity: number,
  currentRoomId: string | null
): { allowed: boolean; reason?: string; warning?: string } {
  // R4: Đã ở phòng khác
  if (targetPerson.roomId && targetPerson.roomId !== currentRoomId) {
    return { allowed: false, reason: 'Đã được đăng ký ở phòng khác' };
  }

  // Đã có trong phòng hiện tại
  if (currentMembers.some(m => m.id === targetPerson.id)) {
    return { allowed: false, reason: 'Đã có trong phòng này' };
  }

  // Giới hạn cứng: Mỗi phòng chỉ tối đa 6 người
  if (currentMembers.length >= 6) {
    return { allowed: false, reason: 'Phòng đã đủ tối đa 6 người' };
  }

  // Giả lập thử thêm vào và kiểm tra
  const updatedMembers = [...currentMembers, targetPerson];
  const newAdultSlots = updatedMembers.filter(m => m.slot > 0).length;
  // Sức chứa dự kiến tự động đổi nếu vượt quá sức chứa ban đầu, tối đa 6
  const effectiveCapacity = Math.min(6, Math.max(capacity, newAdultSlots));

  const validation = validateRoom(updatedMembers, effectiveCapacity, 2, false);

  if (!validation.valid) {
    return { allowed: false, reason: validation.errors[0] };
  }

  if (validation.warnings.length > 0) {
    return { allowed: true, warning: validation.warnings[0] };
  }

  return { allowed: true };
}

/**
 * Thuật toán Auto-Match ghép phòng tự động cho Admin
 * Tối ưu hóa theo thứ tự ưu tiên:
 * 1. Ghép người thân vào phòng của nhân viên bảo trợ (nếu có).
 * 2. ƯU TIÊN 1: Ghép nhân viên CÙNG SIÊU THỊ với nhau (lấp đầy hết tất cả các cặp cùng siêu thị).
 * 3. ƯU TIÊN 2: Sau khi đã ghép hết cùng siêu thị, tiến hành ghép các nhân viên còn lẻ KHÁC SIÊU THỊ.
 */
export function autoMatchRooms(
  people: Person[],
  existingRooms: Room[],
  tripId: string,
  roomLimits?: Record<number, number>
): { newRooms: Room[]; updatedRooms: Room[]; assignedCount: number; sameStoreCount: number; crossStoreCount: number } {
  const newRooms: Room[] = [];
  const updatedRooms: Room[] = [];
  let assignedCount = 0;
  let sameStoreCount = 0;
  let crossStoreCount = 0;

  // Bản sao danh sách để thao tác
  const peopleMap = new Map<string, Person>(people.map(p => [p.id, { ...p }]));
  const roomsMap = new Map<string, Room>(existingRooms.map(r => [r.id, { ...r }]));

  const defaultLimits: Record<number, number> = { 2: 152, 3: 11, 4: 20, 5: 6, 6: 6 };
  const limits: Record<number, number> = roomLimits || defaultLimits;

  // Đếm số lượng phòng hiện có theo từng loại sức chứa
  const roomCounts: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const r of roomsMap.values()) {
    if (roomCounts[r.capacity] !== undefined) {
      roomCounts[r.capacity]++;
    }
  }

  // Hàm lấy loại phòng còn định mức (ưu tiên từ preferredCap, nếu đầy tự chuyển sang loại phòng tiếp theo: 2 -> 3 -> 4 -> 5 -> 6)
  const getNextAvailableCapacity = (preferredCap = 2): number | null => {
    for (let c = preferredCap; c <= 6; c++) {
      const maxLim = limits[c];
      if (maxLim === undefined || (roomCounts[c] || 0) < maxLim) {
        return c;
      }
    }
    for (let c = 2; c < preferredCap; c++) {
      const maxLim = limits[c];
      if (maxLim === undefined || (roomCounts[c] || 0) < maxLim) {
        return c;
      }
    }
    return null; // Đã hết định mức tất cả các loại phòng
  };

  const getNextRoomCode = () => {
    const allCurrentRooms = Array.from(roomsMap.values()).concat(newRooms);
    const existingNums = allCurrentRooms
      .map(r => {
        const match = r.code.match(/^P\.(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    return `P.${nextNum}`;
  };

  // ==============================================================
  // BƯỚC 1: Ghép người thân vào phòng của nhân viên bảo trợ
  // ==============================================================
  const unassignedRelatives = Array.from(peopleMap.values()).filter(p => !p.roomId && p.type === 'RELATIVE' && p.ownerId);
  for (const person of unassignedRelatives) {
    const owner = Array.from(peopleMap.values()).find(p => p.code === person.ownerId);
    if (owner && owner.roomId) {
      const room = roomsMap.get(owner.roomId);
      if (room && room.memberIds.length < 6) {
        const currentMembers = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
        const testValidation = validateRoom([...currentMembers, person], room.capacity, 2, false);
        if (testValidation.valid) {
          room.memberIds.push(person.id);
          room.usedSlots = testValidation.usedSlots;
          room.childCount = testValidation.childCount;
          room.status = testValidation.usedSlots === room.capacity ? 'FULL' : 'UNDER';
          room.bedType = testValidation.bedType;
          person.roomId = room.id;
          assignedCount++;
          sameStoreCount++;
          if (!updatedRooms.some(r => r.id === room.id)) {
            updatedRooms.push(room);
          }
        }
      }
    }
  }

  // ==============================================================
  // HÀM GHÉP THEO GIỚI TÍNH (NAM RIÊNG, NỮ RIÊNG)
  // Ưu tiên 1: Cùng siêu thị
  // Sau khi hết cùng siêu thị -> Ưu tiên 2: Khác siêu thị
  // ==============================================================
  const matchGenderPool = (gender: 'M' | 'F') => {
    // Lấy những người chưa có phòng, cùng giới tính
    const pool = Array.from(peopleMap.values()).filter(p => !p.roomId && p.slot > 0 && p.gender === gender);

    // Nhóm theo siêu thị
    const storeMap = new Map<string, Person[]>();
    for (const p of pool) {
      const storeKey = (p.store || '').trim();
      if (!storeMap.has(storeKey)) {
        storeMap.set(storeKey, []);
      }
      storeMap.get(storeKey)!.push(p);
    }

    const leftovers: Person[] = [];

    // ------------------------------------------------------------
    // GIAI ĐOẠN A: GHÉP NHÂN VIÊN CÙNG SIÊU THỊ TRƯỚC
    // ------------------------------------------------------------
    for (const [storeName, membersInStore] of storeMap.entries()) {
      // A.1: Thử lấp vào các phòng UNDER hiện có của cùng siêu thị này
      for (const room of roomsMap.values()) {
        if (membersInStore.length === 0) break;
        if (room.status === 'UNDER' && !room.adminOverride && room.memberIds.length < 6) {
          const roomMembers = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
          if (roomMembers.length > 0 && roomMembers[0].gender === gender && (roomMembers[0].store || '').trim() === storeName) {
            while (membersInStore.length > 0 && room.usedSlots < room.capacity && room.memberIds.length < 6) {
              const person = membersInStore.shift()!;
              const testMembers = [...room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean), person];
              const testValidation = validateRoom(testMembers, room.capacity, 2, false);
              if (testValidation.valid) {
                room.memberIds.push(person.id);
                room.usedSlots = testValidation.usedSlots;
                room.childCount = testValidation.childCount;
                room.status = testValidation.usedSlots === room.capacity ? 'FULL' : 'UNDER';
                room.bedType = testValidation.bedType;
                person.roomId = room.id;
                assignedCount++;
                sameStoreCount++;
                if (!updatedRooms.some(r => r.id === room.id)) {
                  updatedRooms.push(room);
                }
              } else {
                membersInStore.unshift(person);
                break;
              }
            }
          }
        }
      }

      // A.2: Ghép nhân viên cùng siêu thị vào phòng mới (tự động chuyển sang loại phòng còn định mức)
      while (membersInStore.length >= 2) {
        const targetCap = getNextAvailableCapacity(2);
        if (targetCap === null) {
          // Khách sạn đã hết sạch mọi loại phòng
          break;
        }

        const takeCount = Math.min(targetCap, membersInStore.length);
        if (takeCount < 2) break;

        const chunk = membersInStore.splice(0, takeCount);
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const roomCode = getNextRoomCode();
        const p1 = chunk[0];

        const isFull = chunk.length === targetCap;
        const newRoom: Room = {
          id: roomId,
          tripId,
          code: roomCode,
          capacity: targetCap,
          leaderId: p1.id,
          memberIds: chunk.map(p => p.id),
          usedSlots: chunk.length,
          childCount: 0,
          status: isFull ? 'FULL' : 'UNDER',
          bedType: targetCap === 2 ? 'TWIN' : 'DOUBLE',
          adminOverride: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: 'Ghép tự động (Cùng siêu thị)'
        };

        chunk.forEach(p => { p.roomId = roomId; });
        newRooms.push(newRoom);
        roomsMap.set(roomId, newRoom);
        roomCounts[targetCap] = (roomCounts[targetCap] || 0) + 1;
        assignedCount += chunk.length;
        sameStoreCount += chunk.length;
      }

      // Mỗi siêu thị nếu còn người -> đưa vào danh sách chờ ghép khác siêu thị
      if (membersInStore.length > 0) {
        leftovers.push(...membersInStore);
      }
    }

    // ------------------------------------------------------------
    // GIAI ĐOẠN B: SAU KHI ĐÃ GHÉP HẾT SIÊU THỊ, TIẾN HÀNH GHÉP KHÁC SIÊU THỊ
    // ------------------------------------------------------------
    // B.1: Thử lấp đầy vào các phòng UNDER còn thiếu chỗ
    for (const room of roomsMap.values()) {
      if (leftovers.length === 0) break;
      if (room.status === 'UNDER' && !room.adminOverride && room.memberIds.length < 6) {
        const roomMembers = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
        if (roomMembers.length > 0 && roomMembers[0].gender === gender && roomMembers[0].type !== 'RELATIVE') {
          while (leftovers.length > 0 && room.usedSlots < room.capacity && room.memberIds.length < 6) {
            const person = leftovers.shift()!;
            const testMembers = [...room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean), person];
            const testValidation = validateRoom(testMembers, room.capacity, 2, false);
            if (testValidation.valid) {
              room.memberIds.push(person.id);
              room.usedSlots = testValidation.usedSlots;
              room.childCount = testValidation.childCount;
              room.status = testValidation.usedSlots === room.capacity ? 'FULL' : 'UNDER';
              room.bedType = testValidation.bedType;
              person.roomId = room.id;
              assignedCount++;
              crossStoreCount++;
              if (!updatedRooms.some(r => r.id === room.id) && !newRooms.some(r => r.id === room.id)) {
                updatedRooms.push(room);
              }
            } else {
              leftovers.unshift(person);
              break;
            }
          }
        }
      }
    }

    // B.2: Ghép các người còn lại khác siêu thị thành các phòng mới (tự động chuyển loại phòng theo định mức)
    while (leftovers.length >= 2) {
      const targetCap = getNextAvailableCapacity(2);
      if (targetCap === null) {
        // Khách sạn đã hết sạch mọi loại phòng
        break;
      }

      const takeCount = Math.min(targetCap, leftovers.length);
      const chunk = leftovers.splice(0, takeCount);
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const roomCode = getNextRoomCode();
      const p1 = chunk[0];

      const isFull = chunk.length === targetCap;
      const newRoom: Room = {
        id: roomId,
        tripId,
        code: roomCode,
        capacity: targetCap,
        leaderId: p1.id,
        memberIds: chunk.map(p => p.id),
        usedSlots: chunk.length,
        childCount: 0,
        status: isFull ? 'FULL' : 'UNDER',
        bedType: targetCap === 2 ? 'TWIN' : 'DOUBLE',
        adminOverride: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'Ghép tự động (Khác siêu thị)'
      };

      chunk.forEach(p => { p.roomId = roomId; });
      newRooms.push(newRoom);
      roomsMap.set(roomId, newRoom);
      roomCounts[targetCap] = (roomCounts[targetCap] || 0) + 1;
      assignedCount += chunk.length;
      crossStoreCount += chunk.length;
    }

    // B.3: Nếu toàn đoàn còn lẻ đúng 1 người cuối cùng
    if (leftovers.length === 1) {
      // Thử tìm phòng UNDER cùng giới tính để đưa vào
      let placed = false;
      for (const room of roomsMap.values()) {
        if (room.status === 'UNDER' && !room.adminOverride && room.usedSlots < room.capacity && room.memberIds.length < 6) {
          const roomMembers = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
          if (roomMembers.length > 0 && roomMembers[0].gender === gender && roomMembers[0].type !== 'RELATIVE') {
            const p = leftovers.shift()!;
            room.memberIds.push(p.id);
            room.usedSlots = (room.usedSlots || 0) + 1;
            room.status = room.usedSlots >= room.capacity ? 'FULL' : 'UNDER';
            p.roomId = room.id;
            assignedCount += 1;
            crossStoreCount += 1;
            placed = true;
            if (!updatedRooms.some(r => r.id === room.id) && !newRooms.some(r => r.id === room.id)) {
              updatedRooms.push(room);
            }
            break;
          }
        }
      }

      if (!placed && leftovers.length === 1) {
        const targetCap = getNextAvailableCapacity(2);
        if (targetCap !== null) {
          const p = leftovers.shift()!;
          const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const roomCode = getNextRoomCode();

          const newRoom: Room = {
            id: roomId,
            tripId,
            code: roomCode,
            capacity: targetCap,
            leaderId: p.id,
            memberIds: [p.id],
            usedSlots: 1,
            childCount: 0,
            status: 'UNDER',
            bedType: targetCap === 2 ? 'TWIN' : 'DOUBLE',
            adminOverride: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: 'Ghép tự động (Khác siêu thị)'
          };

          p.roomId = roomId;
          newRooms.push(newRoom);
          roomsMap.set(roomId, newRoom);
          roomCounts[targetCap] = (roomCounts[targetCap] || 0) + 1;
          assignedCount += 1;
          crossStoreCount += 1;
        }
      }
    }
  };

  // Thực hiện ghép riêng cho Nam và Nữ
  matchGenderPool('M');
  matchGenderPool('F');

  return { newRooms, updatedRooms, assignedCount, sameStoreCount, crossStoreCount };
}
