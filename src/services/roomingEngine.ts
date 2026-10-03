import { Person, Room, RuleValidationResult, BedType, Gender } from '../types';

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

  // R8: Cảnh báo nếu phòng chưa đủ số lượng người theo sức chứa thiết kế (trạng thái UNDER)
  const totalOccupants = usedSlots + childCount;
  const isFamilyWithChild = childCount > 0 && totalOccupants >= capacity;

  if (usedSlots < capacity && !isFamilyWithChild) {
    warnings.push(`Phòng đang thiếu người: ${usedSlots}/${capacity} suất (trạng thái Thiếu người, có thể ghép thêm sau).`);
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

  // Danh sách các loại phòng còn định mức (mặc định ưu tiên 2 -> 3 -> 4 -> 5 -> 6)
  const getAvailableCapacities = (preferredOrder = [2, 3, 4, 5, 6]): number[] => {
    return preferredOrder.filter(c => {
      const maxLim = limits[c];
      return maxLim === undefined || (roomCounts[c] || 0) < maxLim;
    });
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
        const testMembers = [...currentMembers, person];
        const nextAdults = testMembers.filter(m => m.slot > 0).length;
        const targetCap = Math.max(room.capacity, nextAdults);

        let canUpgrade = true;
        let finalCap = room.capacity;
        if (targetCap > room.capacity) {
          const availableCap = getNextAvailableCapacity(targetCap);
          if (availableCap !== null) {
            finalCap = availableCap;
          } else {
            canUpgrade = false;
          }
        }

        if (canUpgrade) {
          const testValidation = validateRoom(testMembers, finalCap, 2, false);
          if (testValidation.valid) {
            room.memberIds.push(person.id);
            if (finalCap !== room.capacity) {
              roomCounts[room.capacity] = Math.max(0, (roomCounts[room.capacity] || 1) - 1);
              roomCounts[finalCap] = (roomCounts[finalCap] || 0) + 1;
              room.capacity = finalCap;
            }
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
  }

  // ==============================================================
  // BƯỚC 2: TÌM SUẤT PHÒNG TRỐNG TRONG CÁC PHÒNG ĐÃ CÓ ĐỂ GHÉP ĐẦY TRƯỚC TIÊN
  // (Ưu tiên cùng siêu thị, cùng giới tính; sau đó khác siêu thị, cùng giới tính)
  // ==============================================================
  for (const room of roomsMap.values()) {
    if (room.adminOverride) continue;
    const currentMembers = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
    const usedAdultSlots = currentMembers.filter(m => m.slot > 0).length;
    let emptySlots = room.capacity - usedAdultSlots;
    if (emptySlots <= 0 || room.memberIds.length >= 6) continue;

    // Xác định giới tính của phòng
    const maleAdults = currentMembers.filter(m => m.gender === 'M' && m.slot > 0);
    const femaleAdults = currentMembers.filter(m => m.gender === 'F' && m.slot > 0);
    if (maleAdults.length > 0 && femaleAdults.length > 0) {
      // Phòng gia đình hỗn hợp nam nữ (vợ chồng) -> không tự ý nhét nhân viên khác vào
      continue;
    }
    const targetGender: Gender = maleAdults.length > 0 ? 'M' : femaleAdults.length > 0 ? 'F' : 'M';
    const roomStores = new Set(currentMembers.map(m => (m.store || '').trim()).filter(Boolean));

    // Lọc ứng viên chưa có phòng, cùng giới tính
    const getCandidates = (sameStoreOnly: boolean) => {
      return Array.from(peopleMap.values()).filter(p => {
        if (p.roomId || p.slot <= 0 || p.gender !== targetGender) return false;
        const pStore = (p.store || '').trim();
        return sameStoreOnly ? roomStores.has(pStore) : !roomStores.has(pStore);
      });
    };

    // Vòng 2.1: Lấp bằng người cùng siêu thị
    let sameStoreCandidates = getCandidates(true);
    while (emptySlots > 0 && sameStoreCandidates.length > 0 && room.memberIds.length < 6) {
      const p = sameStoreCandidates.shift()!;
      const testMembers = [...room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean), p];
      const validation = validateRoom(testMembers, room.capacity, 2, false);
      if (validation.valid) {
        room.memberIds.push(p.id);
        room.usedSlots = validation.usedSlots;
        room.childCount = validation.childCount;
        room.bedType = validation.bedType;
        emptySlots = room.capacity - room.usedSlots;
        p.roomId = room.id;
        assignedCount++;
        sameStoreCount++;
        if (!updatedRooms.some(r => r.id === room.id)) updatedRooms.push(room);
      } else {
        break;
      }
    }

    // Vòng 2.2: Lấp bằng người khác siêu thị (nếu vẫn còn chỗ trống)
    let crossStoreCandidates = getCandidates(false);
    while (emptySlots > 0 && crossStoreCandidates.length > 0 && room.memberIds.length < 6) {
      const p = crossStoreCandidates.shift()!;
      const testMembers = [...room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean), p];
      const validation = validateRoom(testMembers, room.capacity, 2, false);
      if (validation.valid) {
        room.memberIds.push(p.id);
        room.usedSlots = validation.usedSlots;
        room.childCount = validation.childCount;
        room.bedType = validation.bedType;
        emptySlots = room.capacity - room.usedSlots;
        p.roomId = room.id;
        assignedCount++;
        crossStoreCount++;
        if (!updatedRooms.some(r => r.id === room.id)) updatedRooms.push(room);
      } else {
        break;
      }
    }

    room.status = (room.usedSlots || 0) >= room.capacity ? 'FULL' : 'UNDER';
  }

  // ==============================================================
  // BƯỚC 3: GHÉP TẠO PHÒNG MỚI CHO NHÂN SỰ CÒN LẠI (Nam riêng, Nữ riêng)
  // Ưu tiên 1: Cùng siêu thị trọn vẹn phòng
  // Ưu tiên 2: Khác siêu thị lấp đầy các phòng 2, 3, 4, 5, 6 theo định mức
  // ==============================================================
  const matchGenderNewRooms = (gender: 'M' | 'F') => {
    const unassigned = Array.from(peopleMap.values()).filter(p => !p.roomId && p.slot > 0 && p.gender === gender);

    // 3.1: Nhóm theo siêu thị
    const storeMap = new Map<string, Person[]>();
    for (const p of unassigned) {
      const sKey = (p.store || '').trim();
      if (!storeMap.has(sKey)) storeMap.set(sKey, []);
      storeMap.get(sKey)!.push(p);
    }

    // Ghép các phòng cùng siêu thị trọn vẹn (chỉ tạo phòng khi có đủ người đạt sức chứa phòng)
    for (const [, membersInStore] of storeMap.entries()) {
      let madeProgress = true;
      while (madeProgress && membersInStore.length >= 2) {
        madeProgress = false;
        const availableCaps = getAvailableCapacities();
        if (availableCaps.length === 0) break;

        // Tìm loại phòng mà membersInStore có đủ số người để lấp đầy (ưu tiên theo availableCaps: 2 -> 3 -> 4 -> 5 -> 6)
        let chosenCap: number | null = null;
        for (const cap of availableCaps) {
          if (membersInStore.length >= cap) {
            chosenCap = cap;
            break;
          }
        }

        if (chosenCap !== null) {
          const chunk = membersInStore.splice(0, chosenCap);
          const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const roomCode = getNextRoomCode();
          const p1 = chunk[0];
          const newRoom: Room = {
            id: roomId,
            tripId,
            code: roomCode,
            capacity: chosenCap,
            leaderId: p1.id,
            memberIds: chunk.map(p => p.id),
            usedSlots: chosenCap,
            childCount: 0,
            status: 'FULL',
            bedType: chosenCap === 2 ? 'TWIN' : chosenCap === 3 ? 'TRIPLE' : 'FAMILY',
            adminOverride: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: 'Ghép tự động (Cùng siêu thị)'
          };
          chunk.forEach(p => { p.roomId = roomId; });
          newRooms.push(newRoom);
          roomsMap.set(roomId, newRoom);
          roomCounts[chosenCap] = (roomCounts[chosenCap] || 0) + 1;
          assignedCount += chosenCap;
          sameStoreCount += chosenCap;
          madeProgress = true;
        }
      }
    }

    // 3.2: Ghép khác siêu thị (Leftovers)
    // Sắp xếp leftovers theo store để những người cùng siêu thị đi chung
    let leftovers = Array.from(peopleMap.values()).filter(p => !p.roomId && p.slot > 0 && p.gender === gender);
    leftovers.sort((a, b) => (a.store || '').localeCompare(b.store || ''));

    while (leftovers.length >= 2) {
      const availableCaps = getAvailableCapacities();
      if (availableCaps.length === 0) break;

      // Ưu tiên loại phòng mà leftovers có đủ người, nếu không đủ thì lấy loại phòng nhỏ nhất còn định mức
      let chosenCap: number | null = null;
      for (const cap of availableCaps) {
        if (leftovers.length >= cap) {
          chosenCap = cap;
          break;
        }
      }
      if (chosenCap === null) {
        chosenCap = availableCaps[0];
      }

      const takeCount = Math.min(chosenCap, leftovers.length);
      if (takeCount < 2) break;

      const chunk = leftovers.splice(0, takeCount);
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const roomCode = getNextRoomCode();
      const p1 = chunk[0];
      const isFull = chunk.length >= chosenCap;
      const newRoom: Room = {
        id: roomId,
        tripId,
        code: roomCode,
        capacity: chosenCap,
        leaderId: p1.id,
        memberIds: chunk.map(p => p.id),
        usedSlots: chunk.length,
        childCount: 0,
        status: isFull ? 'FULL' : 'UNDER',
        bedType: chosenCap === 2 ? 'TWIN' : chosenCap === 3 ? 'TRIPLE' : 'FAMILY',
        adminOverride: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'Ghép tự động (Khác siêu thị)'
      };
      chunk.forEach(p => { p.roomId = roomId; });
      newRooms.push(newRoom);
      roomsMap.set(roomId, newRoom);
      roomCounts[chosenCap] = (roomCounts[chosenCap] || 0) + 1;
      assignedCount += chunk.length;
      crossStoreCount += chunk.length;
    }

    // 3.3: Nếu còn đúng 1 người lẻ
    if (leftovers.length === 1) {
      let placed = false;
      for (const r of roomsMap.values()) {
        if (!r.adminOverride && (r.usedSlots || 0) < r.capacity && r.memberIds.length < 6) {
          const currentMembers = r.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
          const hasOpposite = currentMembers.some(m => m.gender !== gender && m.slot > 0);
          if (!hasOpposite) {
            const p = leftovers.shift()!;
            r.memberIds.push(p.id);
            r.usedSlots = (r.usedSlots || 0) + 1;
            r.status = r.usedSlots >= r.capacity ? 'FULL' : 'UNDER';
            p.roomId = r.id;
            assignedCount++;
            crossStoreCount++;
            if (!updatedRooms.some(room => room.id === r.id) && !newRooms.some(room => room.id === r.id)) {
              updatedRooms.push(r);
            }
            placed = true;
            break;
          }
        }
      }
      if (!placed && leftovers.length === 1) {
        const availableCaps = getAvailableCapacities();
        if (availableCaps.length > 0) {
          const chosenCap = availableCaps[0];
          const p = leftovers.shift()!;
          const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const roomCode = getNextRoomCode();
          const newRoom: Room = {
            id: roomId,
            tripId,
            code: roomCode,
            capacity: chosenCap,
            leaderId: p.id,
            memberIds: [p.id],
            usedSlots: 1,
            childCount: 0,
            status: 'UNDER',
            bedType: chosenCap === 2 ? 'TWIN' : chosenCap === 3 ? 'TRIPLE' : 'FAMILY',
            adminOverride: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: 'Ghép tự động (Khác siêu thị)'
          };
          p.roomId = roomId;
          newRooms.push(newRoom);
          roomsMap.set(roomId, newRoom);
          roomCounts[chosenCap] = (roomCounts[chosenCap] || 0) + 1;
          assignedCount += 1;
          crossStoreCount += 1;
        }
      }
    }
  };

  // Thực hiện ghép riêng cho Nam và Nữ
  matchGenderNewRooms('M');
  matchGenderNewRooms('F');

  return { newRooms, updatedRooms, assignedCount, sameStoreCount, crossStoreCount };
}
