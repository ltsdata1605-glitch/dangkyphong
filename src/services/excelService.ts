import * as XLSX from 'xlsx';
import { Person, Room, Trip } from '../types';
import { inferGender, removeVietnameseTones } from '../utils/textUtils';

/**
 * Xuất file Excel ROOMING LIST đầy đủ 4 Sheet gửi khách sạn và ban tổ chức
 */
export function exportRoomingListExcel(
  trip: Trip,
  people: Person[],
  rooms: Room[]
): void {
  const wb = XLSX.utils.book_new();
  const peopleMap = new Map<string, Person>(people.map(p => [p.id, p]));

  // ==========================================
  // SHEET 1: ROOMING LIST (Gửi Khách Sạn)
  // ==========================================
  const sheet1Data: (string | number)[][] = [
    ['BẢNG XẾP PHÒNG KHÁCH SẠN (ROOMING LIST)'],
    [`Chương trình: ${trip.name}`],
    [`Khách sạn: ${trip.hotelName || 'Khách sạn liên hệ'} - Địa điểm: ${trip.location || 'Theo lịch trình'}`],
    [`Thời gian: ${trip.startDate || ''} - ${trip.endDate || ''} | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`],
    [],
    [
      'STT Phòng',
      'Mã Phòng',
      'Loại Phòng',
      'Kiểu Giường Gợi Ý',
      'SL Người Lớn',
      'SL Trẻ Em',
      'Họ Và Tên',
      'Giới Tính',
      'Quan Hệ / Chức Vụ',
      'MSNV / Mã',
      'MST - Tên Siêu Thị',
      'Ghi Chú Đặc Biệt'
    ]
  ];

  const merges: XLSX.Range[] = [];
  let currentRowIndex = 6; // Dòng bắt đầu dữ liệu (0-indexed)
  let roomIndex = 1;

  // Sắp xếp phòng theo mã
  const sortedRooms = [...rooms].sort((a, b) => a.code.localeCompare(b.code));

  for (const room of sortedRooms) {
    const members = room.memberIds.map(id => peopleMap.get(id)!).filter(Boolean);
    const startRow = currentRowIndex;
    const memberCount = members.length;

    // Bed type text
    let bedTypeText = 'Twin (2 Giường Đơn)';
    if (room.bedType === 'DOUBLE') bedTypeText = 'Double (1 Giường Đôi)';
    else if (room.bedType === 'TRIPLE') bedTypeText = 'Triple (3 Giường / Giường phụ)';
    else if (room.bedType === 'FAMILY') bedTypeText = 'Gia Đình (Family Bed)';

    for (let i = 0; i < memberCount; i++) {
      const m = members[i];
      const isLeader = m.id === room.leaderId;

      let relationText = isLeader ? 'Trưởng phòng' : (m.type === 'EMPLOYEE' ? 'Nhân viên' : (m.relation || 'Người thân'));
      if (m.relation === 'SPOUSE') relationText = 'Vợ / Chồng';
      else if (m.relation === 'PARENT') relationText = 'Ba / Mẹ';
      else if (m.relation === 'CHILD_U5') relationText = 'Con (< 5 tuổi)';
      else if (m.relation === 'CHILD_5_11') relationText = 'Con (5-11 tuổi)';
      else if (m.relation === 'CHILD_12P') relationText = 'Con (>= 12 tuổi)';
      else if (m.type === 'PG') relationText = 'PG Độc lập';

      let note = '';
      if (m.slot === 0) note = 'Trẻ em ngủ chung bố mẹ';
      if (room.adminNote && i === 0) note = `${room.adminNote} ${note}`;

      sheet1Data.push([
        roomIndex,
        room.code,
        `Phòng ${room.capacity} người`,
        bedTypeText,
        room.usedSlots,
        room.childCount,
        m.name,
        m.gender === 'M' ? 'Nam' : 'Nữ',
        relationText,
        m.code,
        m.store,
        note
      ]);

      currentRowIndex++;
    }

    // Merge các ô thuộc tính phòng nếu phòng có từ 2 thành viên trở lên
    if (memberCount > 1) {
      for (let col = 0; col <= 5; col++) {
        merges.push({
          s: { r: startRow, c: col },
          e: { r: startRow + memberCount - 1, c: col }
        });
      }
    }

    roomIndex++;
  }

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!merges'] = merges;
  ws1['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 24 }, { wch: 12 }, { wch: 12 },
    { wch: 28 }, { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 38 }, { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'ROOMING LIST');

  // ==========================================
  // SHEET 2: DANH SÁCH TOÀN BỘ NGƯỜI THAM GIA
  // ==========================================
  const sheet2Data: (string | number)[][] = [
    ['DANH SÁCH TRA CỨU NHÂN SỰ TOÀN ĐOÀN'],
    [`Tổng số người tham gia: ${people.length} người`],
    [],
    [
      'STT',
      'Mã / MSNV',
      'Họ Và Tên',
      'Giới Tính',
      'Phân Loại',
      'Quan Hệ',
      'MSNV Đi Kèm',
      'MST - Tên Siêu Thị',
      'Phòng Được Xếp',
      'Trưởng Phòng',
      'Trạng Thái Phòng'
    ]
  ];

  people.forEach((p, idx) => {
    const room = p.roomId ? rooms.find(r => r.id === p.roomId) : null;
    const leader = room ? peopleMap.get(room.leaderId) : null;

    let pTypeText = 'Nhân viên';
    if (p.type === 'RELATIVE') pTypeText = 'Người thân';
    if (p.type === 'PG') pTypeText = 'PG Độc lập';

    sheet2Data.push([
      idx + 1,
      p.code,
      p.name,
      p.gender === 'M' ? 'Nam' : 'Nữ',
      pTypeText,
      p.relation || '',
      p.ownerId || '',
      p.store,
      room ? room.code : 'Chưa có phòng',
      leader ? leader.name : '',
      room ? (room.status === 'FULL' ? 'Đủ người' : 'Thiếu người') : 'Chưa xếp'
    ]);
  });

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 28 }, { wch: 10 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 38 }, { wch: 16 }, { wch: 24 }, { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'DANH SÁCH TOÀN ĐOÀN');

  // ==========================================
  // SHEET 3: BẢNG TỔNG HỢP ĐẶT PHÒNG (BOOKING SUMMARY)
  // ==========================================
  const capacityCounts: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let totalAdultSlots = 0;
  let totalChildrenU5 = 0;
  let totalChildren511 = 0;
  let totalChildren12P = 0;
  let totalPG = 0;

  rooms.forEach(r => {
    if (capacityCounts[r.capacity] !== undefined) {
      capacityCounts[r.capacity]++;
    }
  });

  people.forEach(p => {
    if (p.relation === 'CHILD_U5') totalChildrenU5++;
    else if (p.relation === 'CHILD_5_11') totalChildren511++;
    else if (p.relation === 'CHILD_12P') totalChildren12P++;
    else if (p.type === 'PG') totalPG++;

    if (p.slot > 0) totalAdultSlots++;
  });

  const sheet3Data: (string | number)[][] = [
    ['BẢNG TỔNG HỢP SỐ LƯỢNG PHÒNG VÀ ĐỐI TƯỢNG (BOOKING SUMMARY)'],
    [`Chương trình: ${trip.name}`],
    [],
    ['1. THỐNG KÊ SỐ LƯỢNG PHÒNG THEO LOẠI CẦN ĐẶT KHÁCH SẠN'],
    ['Loại phòng', 'Số lượng phòng đã tạo', 'Ghi chú'],
    ['Phòng 2 người (Standard/Deluxe)', capacityCounts[2], 'Twin / Double'],
    ['Phòng 3 người (Triple)', capacityCounts[3], '3 Giường / Twin + Extrabed'],
    ['Phòng 4 người (Quad)', capacityCounts[4], '4 Giường / Family'],
    ['Phòng 5 người (Family Suite)', capacityCounts[5], 'Family Suite'],
    ['Phòng 6 người (Family Suite)', capacityCounts[6], 'Family Suite'],
    ['TỔNG SỐ PHÒNG', rooms.length, ''],
    [],
    ['2. THỐNG KÊ NHÂN SỰ VÀ SUẤT ĂN / DỊCH VỤ'],
    ['Hạng mục', 'Số lượng người', 'Ghi chú'],
    ['Tổng số người tham gia', people.length, ''],
    ['Tổng số suất người lớn', totalAdultSlots, 'Tính 1 suất trọn gói'],
    ['Trẻ em dưới 5 tuổi', totalChildrenU5, 'Ngủ chung, miễn phí dịch vụ KS'],
    ['Trẻ em từ 5 - 11 tuổi', totalChildren511, 'Ngủ chung, tính vé buffet/ăn sáng KS'],
    ['Trẻ em từ 12 tuổi trở lên', totalChildren12P, 'Tính như người lớn'],
    ['PG (Promotion Staff)', totalPG, 'Xếp phòng theo giới tính']
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [{ wch: 32 }, { wch: 24 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'TỔNG HỢP ĐẶT PHÒNG');

  // ==========================================
  // SHEET 4: CẢNH BÁO & CHƯA ĐĂNG KÝ
  // ==========================================
  const unassignedEmployees = people.filter(p => p.type === 'EMPLOYEE' && !p.roomId);
  const unassignedRelatives = people.filter(p => p.type !== 'EMPLOYEE' && !p.roomId);
  const underCapacityRooms = rooms.filter(r => r.status === 'UNDER');

  const sheet4Data: (string | number)[][] = [
    ['DANH SÁCH CẢNH BÁO & NHÂN SỰ CHƯA XẾP PHÒNG'],
    [`Cập nhật lúc: ${new Date().toLocaleString('vi-VN')}`],
    [],
    ['1. NHÂN VIÊN CHƯA ĐĂNG KÝ PHÒNG'],
    ['STT', 'MSNV', 'Họ Và Tên', 'Giới Tính', 'Siêu Thị'],
    ...unassignedEmployees.map((p, idx) => [idx + 1, p.code, p.name, p.gender === 'M' ? 'Nam' : 'Nữ', p.store]),
    [],
    ['2. NGƯỜI THÂN / PG CHƯA CÓ PHÒNG'],
    ['STT', 'Mã / Tên', 'Quan Hệ', 'MSNV Bảo Trợ', 'Siêu Thị'],
    ...unassignedRelatives.map((p, idx) => [idx + 1, p.name, p.relation || p.type, p.ownerId || 'Chưa gắn nhân viên', p.store]),
    [],
    ['3. PHÒNG CÒN THIẾU NGƯỜI'],
    ['STT', 'Mã Phòng', 'Loại Phòng', 'Số Suất Hiện Có', 'Số Suất Còn Trống', 'Trưởng Phòng'],
    ...underCapacityRooms.map((r, idx) => {
      const leader = peopleMap.get(r.leaderId);
      return [idx + 1, r.code, `Phòng ${r.capacity} người`, r.usedSlots, r.capacity - r.usedSlots, leader ? leader.name : ''];
    })
  ];

  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Data);
  ws4['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 40 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'CẢNH BÁO & CHƯA ĐK');

  // Xuất file
  const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
  const fileName = `ROOMING_LIST_${trip.name.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_')}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Xử lý tải lên và phân tích file Excel
 */
export async function parseUploadedExcel(file: File): Promise<{
  success: boolean;
  people: Person[];
  errors: string[];
  warnings: string[];
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rows.length < 2) {
          resolve({
            success: false,
            people: [],
            errors: ['File Excel rỗng hoặc không có dữ liệu hợp lệ.'],
            warnings: []
          });
          return;
        }

        const errors: string[] = [];
        const warnings: string[] = [];
        const parsedPeople: Person[] = [];
        const empByStore: Record<string, Person[]> = {};

        // Vòng 1: Tìm dòng nhân viên trước
        let ntCounter = 1;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || !row[1]) continue;

          const colA = String(row[0] || '').trim(); // USER (MSNV hoặc Quan hệ)
          const colB = String(row[1] || '').trim(); // HỌ TÊN
          const colC = String(row[2] || '').trim(); // MST - TÊN SIÊU THỊ
          const colD = String(row[3] || '').trim().toUpperCase(); // NHÂN VIÊN / NGƯỜI THÂN
          const colE = String(row[4] || '').trim(); // GIỚI TÍNH

          if (colD === 'NHÂN VIÊN') {
            const gender = colE.toLowerCase().includes('nữ') ? 'F' : 'M';
            const person: Person = {
              id: `emp_${colA}_${Date.now()}_${i}`,
              code: colA,
              name: colB,
              nameUnsigned: removeVietnameseTones(colB),
              store: colC,
              type: 'EMPLOYEE',
              relation: null,
              gender,
              ownerId: null,
              slot: 1,
              roomId: null
            };
            parsedPeople.push(person);

            if (!empByStore[colC]) empByStore[colC] = [];
            empByStore[colC].push(person);
          }
        }

        // Vòng 2: Xử lý người thân và PG
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || !row[1]) continue;

          const colA = String(row[0] || '').trim();
          const colB = String(row[1] || '').trim();
          const colC = String(row[2] || '').trim();
          const colD = String(row[3] || '').trim().toUpperCase();
          const colE = String(row[4] || '').trim();

          if (colD !== 'NHÂN VIÊN') {
            const isPG = colA.toUpperCase().includes('PG');
            let pType: 'PG' | 'RELATIVE' = isPG ? 'PG' : 'RELATIVE';
            let relation: Person['relation'] = 'OTHER';
            let slot = 1;

            const relLower = colA.toLowerCase();
            if (relLower.includes('vợ') || relLower.includes('chồng')) {
              relation = 'SPOUSE';
              slot = 1;
            } else if (relLower.includes('ba') || relLower.includes('mẹ')) {
              relation = 'PARENT';
              slot = 1;
            } else if (relLower.includes('dưới 5') || relLower.includes('< 5')) {
              relation = 'CHILD_U5';
              slot = 0;
            } else if (relLower.includes('5-11') || relLower.includes('5 - 11')) {
              relation = 'CHILD_5_11';
              slot = 0;
            } else if (relLower.includes('12')) {
              relation = 'CHILD_12P';
              slot = 1;
            } else if (isPG) {
              relation = 'PG';
              slot = 1;
            }

            // Xử lý auto-link nếu siêu thị có đúng 1 nhân viên
            let ownerId: string | null = null;
            let employeeGender: 'M' | 'F' | undefined = undefined;

            if (pType !== 'PG') {
              const matchingEmps = empByStore[colC] || [];
              if (matchingEmps.length === 1) {
                ownerId = matchingEmps[0].code;
                employeeGender = matchingEmps[0].gender;
              } else if (matchingEmps.length > 1) {
                warnings.push(`Dòng ${i + 1}: Người thân "${colB}" tại "${colC}" có ${matchingEmps.length} nhân viên cùng siêu thị. Cần nhân viên hoặc Admin chọn gán thủ công.`);
              }
            }

            // Suy luận giới tính thông minh
            let gender = inferGender(colB, relation, employeeGender);
            if (colE.toLowerCase().includes('nữ')) gender = 'F';
            else if (colE.toLowerCase().includes('nam')) gender = 'M';

            const personCode = ownerId ? `${ownerId}-NT${ntCounter}` : `NT${String(ntCounter).padStart(3, '0')}`;
            ntCounter++;

            const person: Person = {
              id: `rel_${i}_${Date.now()}`,
              code: personCode,
              name: colB,
              nameUnsigned: removeVietnameseTones(colB),
              store: colC,
              type: pType,
              relation,
              gender,
              ownerId,
              slot,
              roomId: null
            };

            parsedPeople.push(person);
          }
        }

        resolve({
          success: true,
          people: parsedPeople,
          errors,
          warnings
        });
      } catch (err: any) {
        resolve({
          success: false,
          people: [],
          errors: [`Lỗi đọc file Excel: ${err?.message || 'Định dạng file không hỗ trợ.'}`],
          warnings: []
        });
      }
    };

    reader.readAsBinaryString(file);
  });
}
