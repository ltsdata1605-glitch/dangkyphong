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

  // Giả lập thử thêm vào và kiểm tra
  const updatedMembers = [...currentMembers, targetPerson];
  const validation = validateRoom(updatedMembers, capacity, 2, false);

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
 * Tối ưu hóa:
 * 1. Ghép người thân vào phòng của nhân viên bảo trợ nếu nhân viên đã có phòng còn chỗ.
 * 2. Gom những người chưa có phòng cùng giới tính, cùng siêu thị vào phòng 2..4 người.
 * 3. Lấp đầy các phòng còn thiếu người cùng giới tính.
 */
export function autoMatchRooms(
  people: Person[],
  existingRooms: Room[],
  tripId: string
): { newRooms: Room[]; updatedRooms: Room[]; assignedCount: number } {
  const newRooms: Room[] = [];
  const updatedRooms: Room[] = [];
  let assignedCount = 0;

  // Bản sao danh sách để thao tác
  const peopleMap = new Map<string, Person>(people.map(p => [p.id, { ...p }]));
  const roomsMap = new Map<string, Room>(existingRooms.map(r => [r.id, { ...r }]));

  // Lấy danh sách những người chưa có phòng
  const unassigned = Array.from(peopleMap.values()).filter(p => !p.roomId);

  // Bước 1: Ghép người thân vào phòng của nhân viên bảo trợ
  for (const person of unassigned) {
    if (person.type === 'RELATIVE' && person.ownerId) {
      const owner = Array.from(peopleMap.values()).find(p => p.code === person.ownerId);
      if (owner && owner.roomId) {
        const room = roomsMap.get(owner.roomId);
        if (room) {
          const currentMembers = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
          const validation = validateRoom([...currentMembers, person], room.capacity, 2, false);
          if (validation.valid) {
            room.memberIds.push(person.id);
            room.usedSlots = validation.usedSlots;
            room.childCount = validation.childCount;
            room.status = validation.usedSlots === room.capacity ? 'FULL' : 'UNDER';
            room.bedType = validation.bedType;
            person.roomId = room.id;
            assignedCount++;
            if (!updatedRooms.some(r => r.id === room.id)) {
              updatedRooms.push(room);
            }
          }
        }
      }
    }
  }

  // Lọc lại những người vẫn chưa có phòng
  const remaining = Array.from(peopleMap.values()).filter(p => !p.roomId && p.slot > 0);

  // Bước 2: Thử lấp đầy các phòng còn thiếu người (cùng giới tính, không phải phòng gia đình riêng tư)
  for (const room of roomsMap.values()) {
    if (room.status === 'UNDER' && !room.adminOverride) {
      const members = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
      if (members.length === 0) continue;
      const roomGender = members[0].gender;

      // Tìm người phù hợp cùng giới tính
      for (const person of remaining) {
        if (!person.roomId && person.gender === roomGender && person.type !== 'RELATIVE') {
          const testMembers = [...members, person];
          const testValidation = validateRoom(testMembers, room.capacity, 2, false);
          if (testValidation.valid) {
            room.memberIds.push(person.id);
            room.usedSlots = testValidation.usedSlots;
            room.childCount = testValidation.childCount;
            room.status = testValidation.usedSlots === room.capacity ? 'FULL' : 'UNDER';
            room.bedType = testValidation.bedType;
            person.roomId = room.id;
            assignedCount++;
            if (!updatedRooms.some(r => r.id === room.id)) {
              updatedRooms.push(room);
            }
            if (room.status === 'FULL') break;
          }
        }
      }
    }
  }

  // Bước 3: Ghép những người còn lại thành các phòng mới 2 người cùng giới
  const remainingMales = Array.from(peopleMap.values()).filter(p => !p.roomId && p.slot > 0 && p.gender === 'M');
  const remainingFemales = Array.from(peopleMap.values()).filter(p => !p.roomId && p.slot > 0 && p.gender === 'F');

  const createPairs = (pool: Person[], genderLabel: string) => {
    // Ưu tiên gom cùng siêu thị
    pool.sort((a, b) => a.store.localeCompare(b.store));

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

    while (pool.length >= 2) {
      const p1 = pool.shift()!;
      const p2 = pool.shift()!;
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const roomCode = getNextRoomCode();

      const newRoom: Room = {
        id: roomId,
        tripId,
        code: roomCode,
        capacity: 2,
        leaderId: p1.id,
        memberIds: [p1.id, p2.id],
        usedSlots: 2,
        childCount: 0,
        status: 'FULL',
        bedType: 'TWIN',
        adminOverride: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'Hệ thống ghép tự động'
      };

      p1.roomId = roomId;
      p2.roomId = roomId;
      newRooms.push(newRoom);
      assignedCount += 2;
    }

    // Nếu còn lẻ 1 người -> Tạo phòng 2 người (để trống 1 chỗ)
    if (pool.length === 1) {
      const p = pool.shift()!;
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const roomCode = getNextRoomCode();

      const newRoom: Room = {
        id: roomId,
        tripId,
        code: roomCode,
        capacity: 2,
        leaderId: p.id,
        memberIds: [p.id],
        usedSlots: 1,
        childCount: 0,
        status: 'UNDER',
        bedType: 'TWIN',
        adminOverride: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'Hệ thống ghép tự động'
      };

      p.roomId = roomId;
      newRooms.push(newRoom);
      assignedCount += 1;
    }
  };

  createPairs(remainingMales, 'Nam');
  createPairs(remainingFemales, 'Nữ');

  return { newRooms, updatedRooms, assignedCount };
}
