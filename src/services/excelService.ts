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
  const roomsMap = new Map<string, Room>(rooms.map(r => [r.id, r]));

  // ==========================================
  // SHEET 1: DANH SÁCH ĐÃ SẮP PHÒNG (GIỐNG FILE ĐÃ NHẬP + 2 CỘT SỐ PHÒNG, LOẠI PHÒNG)
  // ==========================================
  const sheetImportStyleData: (string | number)[][] = [
    [
      'USER',
      'HỌ TÊN THAM GIA',
      'MST - TÊN SIÊU THỊ',
      'NHÂN VIÊN / NGƯỜI THÂN',
      'GIỚI TÍNH',
      'SỐ PHÒNG',
      'LOẠI PHÒNG'
    ]
  ];

  people.forEach(p => {
    const room = p.roomId ? roomsMap.get(p.roomId) : null;

    // 1. Cột USER (MSNV với nhân viên, hoặc Tên quan hệ/Mã người thân)
    let userVal = p.code;
    if (p.type === 'EMPLOYEE') {
      userVal = p.code;
    } else if (p.type === 'PG') {
      userVal = 'PG';
    } else if (p.type === 'RELATIVE') {
      if (p.relation === 'SPOUSE') userVal = 'Vợ/Chồng';
      else if (p.relation === 'PARENT') userVal = 'Ba/Mẹ';
      else if (p.relation === 'CHILD_U5') userVal = 'Con dưới 5 Tuổi';
      else if (p.relation === 'CHILD_5_11') userVal = 'Con 5-11 Tuổi';
      else if (p.relation === 'CHILD_12P') userVal = 'Con từ 12 Tuổi';
      else if (p.code && !p.code.includes('-NT') && !p.code.startsWith('NT')) userVal = p.code;
      else userVal = 'Người thân';
    }

    // 2. Cột NHÂN VIÊN / NGƯỜI THÂN
    const typeVal = p.type === 'EMPLOYEE' ? 'NHÂN VIÊN' : (p.type === 'PG' ? 'PG' : 'NGƯỜI THÂN');

    // 3. Cột GIỚI TÍNH
    const genderVal = p.gender === 'M' ? 'Nam' : 'Nữ';

    // 4. Cột SỐ PHÒNG (Mã số phòng, ví dụ: P.1, P.2...)
    const roomCodeVal = room ? room.code : '';

    // 5. Cột LOẠI PHÒNG (Ví dụ: Phòng 2 người - TWIN, Phòng 2 người - DOUBLE, Phòng 4 người - FAMILY...)
    let roomTypeVal = '';
    if (room) {
      roomTypeVal = `Phòng ${room.capacity} người - ${room.bedType}`;
    }

    sheetImportStyleData.push([
      userVal,
      p.name,
      p.store,
      typeVal,
      genderVal,
      roomCodeVal,
      roomTypeVal
    ]);
  });

  const wsImportStyle = XLSX.utils.aoa_to_sheet(sheetImportStyleData);
  wsImportStyle['!cols'] = [
    { wch: 18 }, // USER
    { wch: 28 }, // HỌ TÊN THAM GIA
    { wch: 42 }, // MST - TÊN SIÊU THỊ
    { wch: 26 }, // NHÂN VIÊN / NGƯỜI THÂN
    { wch: 12 }, // GIỚI TÍNH
    { wch: 16 }, // SỐ PHÒNG
    { wch: 28 }  // LOẠI PHÒNG
  ];
  XLSX.utils.book_append_sheet(wb, wsImportStyle, 'DANH SÁCH ĐÃ SẮP PHÒNG');

  // ==========================================
  // SHEET 2: ROOMING LIST (Gửi Khách Sạn)
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

  // Sắp xếp phòng theo mã số tự nhiên (P.1, P.2... P.10)
  const sortedRooms = [...rooms].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));

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
  const fileName = `DANH_SACH_SAP_PHONG_${trip.name.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_')}_${dateStr}.xlsx`;
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
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        people: [],
        errors: ['File Excel không chứa bất kỳ trang tính (sheet) nào.'],
        warnings: []
      };
    }

    // 1. Tìm sheet đầu tiên có chứa dữ liệu bảng
    let targetRows: any[][] = [];
    let selectedSheetName = '';

    for (const sName of workbook.SheetNames) {
      const ws = workbook.Sheets[sName];
      if (!ws) continue;
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
      if (rows && rows.length >= 2) {
        targetRows = rows;
        selectedSheetName = sName;
        break;
      }
    }

    if (!targetRows || targetRows.length < 2) {
      return {
        success: false,
        people: [],
        errors: ['File Excel rỗng hoặc không tìm thấy hàng dữ liệu hợp lệ.'],
        warnings: []
      };
    }

    // 2. Tự động quét tìm hàng tiêu đề (Header row) trong 15 dòng đầu tiên
    let headerRowIdx = -1;
    let colName = -1;
    let colUser = -1;
    let colStore = -1;
    let colType = -1;
    let colGender = -1;
    let colPhone = -1;

    for (let r = 0; r < Math.min(15, targetRows.length); r++) {
      const row = targetRows[r];
      if (!row || !Array.isArray(row)) continue;

      const lowerRow = row.map(c => removeVietnameseTones(String(c || '')).trim());

      const hasName = lowerRow.some(c => c.includes('ho ten') || c.includes('ho va ten') || c === 'ten' || c === 'name');
      const hasUser = lowerRow.some(c => c.includes('user') || c.includes('msnv') || c.includes('ma nv') || c.includes('ma so') || c === 'ma');
      const hasStore = lowerRow.some(c => c.includes('sieu thi') || c.includes('mst') || c.includes('don vi') || c.includes('chi nhanh'));
      const hasType = lowerRow.some(c => c.includes('nhan vien') || c.includes('doi tuong') || c.includes('nguoi than') || c.includes('phan loai'));
      const hasGender = lowerRow.some(c => c.includes('gioi tinh') || c.includes('phai') || c.includes('nam/nu'));

      const matchScore = [hasName, hasUser, hasStore, hasType, hasGender].filter(Boolean).length;

      if (matchScore >= 2 || (hasName && (hasUser || hasStore))) {
        headerRowIdx = r;

        lowerRow.forEach((c, idx) => {
          if (colName === -1 && (c.includes('ho ten') || c.includes('ho va ten') || c.includes('ten tham gia') || c === 'ten' || c === 'name')) {
            colName = idx;
          } else if (colUser === -1 && (c.includes('user') || c.includes('msnv') || c.includes('ma nv') || c.includes('ma so') || c === 'ma' || c === 'code')) {
            colUser = idx;
          } else if (colStore === -1 && (c.includes('sieu thi') || c.includes('mst') || c.includes('don vi') || c.includes('chi nhanh') || c.includes('store') || c.includes('phong ban'))) {
            colStore = idx;
          } else if (colType === -1 && (c.includes('nhan vien /') || c.includes('doi tuong') || c.includes('phan loai') || c.includes('loai') || c.includes('chuc danh'))) {
            colType = idx;
          } else if (colGender === -1 && (c.includes('gioi tinh') || c.includes('phai') || c.includes('nam/nu') || c === 'gt' || c === 'gender')) {
            colGender = idx;
          } else if (colPhone === -1 && (c.includes('sdt') || c.includes('dien thoai') || c.includes('phone') || c.includes('mobile'))) {
            colPhone = idx;
          }
        });
        break;
      }
    }

    // Nếu không tìm thấy bằng từ khóa, dự đoán theo vị trí cột mặc định
    if (headerRowIdx === -1) {
      headerRowIdx = 0;
      colUser = 0;
      colName = 1;
      colStore = 2;
      colType = 3;
      colGender = 4;
    } else {
      // Bổ sung các cột chưa map được
      if (colName === -1) colName = 1;
      if (colUser === -1) colUser = colName === 1 ? 0 : 1;
      if (colStore === -1) colStore = 2;
      if (colGender === -1) colGender = 4;
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const parsedPeople: Person[] = [];
    const empByStore: Record<string, Person[]> = {};

    const dataRows = targetRows.slice(headerRowIdx + 1);

    // Vòng 1: Tìm dòng nhân viên trước
    let ntCounter = 1;
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const rawUser = String(row[colUser] !== undefined ? row[colUser] : '').trim();
      const rawName = String(row[colName] !== undefined ? row[colName] : '').trim();
      const rawStore = String(row[colStore] !== undefined ? row[colStore] : '').trim();
      const rawType = colType >= 0 ? String(row[colType] !== undefined ? row[colType] : '').trim() : '';
      const rawGender = colGender >= 0 ? String(row[colGender] !== undefined ? row[colGender] : '').trim() : '';
      const rawPhone = colPhone >= 0 ? String(row[colPhone] !== undefined ? row[colPhone] : '').trim() : '';

      if (!rawName) continue;

      const cleanType = removeVietnameseTones(rawType).toLowerCase();
      const cleanUser = removeVietnameseTones(rawUser).toLowerCase();

      // Kiểm tra có phải là nhân viên không
      let isEmployee = false;
      if (cleanType.includes('nhan vien') || cleanType === 'nv') {
        isEmployee = true;
      } else if (cleanType.includes('nguoi than') || cleanType === 'nt' || cleanType.includes('pg')) {
        isEmployee = false;
      } else {
        // Suy luận từ cột USER: nếu là số MSNV và không chứa từ quan hệ -> Nhân viên
        const hasDigit = /\d{3,}/.test(rawUser);
        const hasRelation = /vo|chong|con|ba|me|bo|chau/i.test(cleanUser);
        if (hasDigit && !hasRelation) {
          isEmployee = true;
        } else if (!hasRelation && !cleanUser.includes('pg')) {
          isEmployee = true;
        }
      }

      if (isEmployee) {
        let gender: 'M' | 'F' = 'M';
        const cleanGender = removeVietnameseTones(rawGender).toLowerCase();
        if (cleanGender.includes('nu') || cleanGender === 'f') {
          gender = 'F';
        } else if (cleanGender.includes('nam') || cleanGender === 'm') {
          gender = 'M';
        } else {
          gender = inferGender(rawName);
        }

        const person: Person = {
          id: `emp_${rawUser || Date.now()}_${i}`,
          code: rawUser || `NV${String(i + 1).padStart(4, '0')}`,
          name: rawName,
          nameUnsigned: removeVietnameseTones(rawName),
          store: rawStore || 'Văn phòng chính',
          type: 'EMPLOYEE',
          relation: null,
          gender,
          ownerId: null,
          slot: 1,
          roomId: null,
          phone: rawPhone || undefined
        };

        parsedPeople.push(person);

        const storeKey = person.store;
        if (!empByStore[storeKey]) empByStore[storeKey] = [];
        empByStore[storeKey].push(person);
      }
    }

    // Vòng 2: Xử lý Người thân và PG
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const rawUser = String(row[colUser] !== undefined ? row[colUser] : '').trim();
      const rawName = String(row[colName] !== undefined ? row[colName] : '').trim();
      const rawStore = String(row[colStore] !== undefined ? row[colStore] : '').trim();
      const rawType = colType >= 0 ? String(row[colType] !== undefined ? row[colType] : '').trim() : '';
      const rawGender = colGender >= 0 ? String(row[colGender] !== undefined ? row[colGender] : '').trim() : '';
      const rawPhone = colPhone >= 0 ? String(row[colPhone] !== undefined ? row[colPhone] : '').trim() : '';

      if (!rawName) continue;

      const cleanType = removeVietnameseTones(rawType).toLowerCase();
      const cleanUser = removeVietnameseTones(rawUser).toLowerCase();

      let isEmployee = false;
      if (cleanType.includes('nhan vien') || cleanType === 'nv') {
        isEmployee = true;
      } else if (cleanType.includes('nguoi than') || cleanType === 'nt' || cleanType.includes('pg')) {
        isEmployee = false;
      } else {
        const hasDigit = /\d{3,}/.test(rawUser);
        const hasRelation = /vo|chong|con|ba|me|bo|chau/i.test(cleanUser);
        if (hasDigit && !hasRelation) {
          isEmployee = true;
        } else if (!hasRelation && !cleanUser.includes('pg')) {
          isEmployee = true;
        }
      }

      if (!isEmployee) {
        const isPG = cleanType.includes('pg') || cleanUser.includes('pg');
        let pType: 'PG' | 'RELATIVE' = isPG ? 'PG' : 'RELATIVE';
        let relation: Person['relation'] = 'OTHER';
        let slot = 1;

        const relCombined = `${cleanUser} ${cleanType}`;
        if (relCombined.includes('vo') || relCombined.includes('chong')) {
          relation = 'SPOUSE';
          slot = 1;
        } else if (relCombined.includes('ba') || relCombined.includes('me') || relCombined.includes('bo')) {
          relation = 'PARENT';
          slot = 1;
        } else if (relCombined.includes('duoi 5') || relCombined.includes('< 5') || relCombined.includes('<5')) {
          relation = 'CHILD_U5';
          slot = 0; // Trẻ em dưới 11 tuổi: 0 suất (ở cùng người thân)
        } else if (relCombined.includes('5-11') || relCombined.includes('5 - 11') || relCombined.includes('5–11')) {
          relation = 'CHILD_5_11';
          slot = 0; // Trẻ em dưới 11 tuổi: 0 suất (ở cùng người thân)
        } else if (relCombined.includes('12') || relCombined.includes('lon hon 11')) {
          relation = 'CHILD_12P';
          slot = 1;
        } else if (relCombined.includes('con')) {
          relation = 'CHILD_5_11';
          slot = 0; // Mặc định bé là con đi cùng: 0 suất
        } else if (isPG) {
          relation = 'PG';
          slot = 1;
        }

        // Tự động gán nếu siêu thị có đúng 1 nhân viên
        let ownerId: string | null = null;
        let employeeGender: 'M' | 'F' | undefined = undefined;

        if (pType !== 'PG') {
          const matchingEmps = empByStore[rawStore] || [];
          if (matchingEmps.length === 1) {
            ownerId = matchingEmps[0].code;
            employeeGender = matchingEmps[0].gender;
          } else if (matchingEmps.length > 1) {
            warnings.push(`Dòng ${i + 2}: Người thân "${rawName}" tại "${rawStore}" có ${matchingEmps.length} nhân viên cùng siêu thị. Nhân viên có thể tự nhận hoặc Admin gán thủ công.`);
          }
        }

        // Suy luận giới tính
        let gender: 'M' | 'F' = 'M';
        const cleanGender = removeVietnameseTones(rawGender).toLowerCase();
        if (cleanGender.includes('nu') || cleanGender === 'f') {
          gender = 'F';
        } else if (cleanGender.includes('nam') || cleanGender === 'm') {
          gender = 'M';
        } else {
          gender = inferGender(rawName, relation, employeeGender);
        }

        const personCode = ownerId ? `${ownerId}-NT${ntCounter}` : `NT${String(ntCounter).padStart(3, '0')}`;
        ntCounter++;

        const person: Person = {
          id: `rel_${rawUser || Date.now()}_${i}`,
          code: personCode,
          name: rawName,
          nameUnsigned: removeVietnameseTones(rawName),
          store: rawStore || 'Văn phòng chính',
          type: pType,
          relation,
          gender,
          ownerId,
          slot,
          roomId: null,
          phone: rawPhone || undefined
        };

        parsedPeople.push(person);
      }
    }

    if (parsedPeople.length === 0) {
      return {
        success: false,
        people: [],
        errors: ['Không tìm thấy dữ liệu nhân sự hợp lệ trong trang tính. Vui lòng kiểm tra lại file hoặc xuất file mẫu chuẩn.'],
        warnings
      };
    }

    return {
      success: true,
      people: parsedPeople,
      errors,
      warnings
    };
  } catch (err: any) {
    return {
      success: false,
      people: [],
      errors: [`Lỗi xử lý file Excel: ${err?.message || 'Định dạng file không được hỗ trợ.'}`],
      warnings: []
    };
  }
}

/**
 * Xuất file Excel mẫu danh sách nhân sự (Template) chuẩn để Admin dễ dàng nhập liệu cho chuyến đi
 */
export function exportTemplatePersonnelExcel(): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: MẪU DANH SÁCH NHẬP LIỆU
  const templateHeaders = [
    ['USER', 'HỌ TÊN THAM GIA', 'MST - TÊN SIÊU THỊ', 'NHÂN VIÊN / NGƯỜI THÂN', 'GIỚI TÍNH'],
    ['21707', 'Nguyễn Văn An', '910 - ĐML_STR_STR - 99 Hùng Vương', 'NHÂN VIÊN', 'Nam'],
    ['Vợ/Chồng', 'Trần Thị Bích', '910 - ĐML_STR_STR - 99 Hùng Vương', 'NGƯỜI THÂN', 'Nữ'],
    ['Con dưới 5 Tuổi', 'Nguyễn Gia Bảo', '910 - ĐML_STR_STR - 99 Hùng Vương', 'NGƯỜI THÂN', 'Nam'],
    ['Con 5-11 Tuổi', 'Nguyễn Thảo My', '910 - ĐML_STR_STR - 99 Hùng Vương', 'NGƯỜI THÂN', 'Nữ'],
    ['Con từ 12 Tuổi', 'Nguyễn Hữu Tài', '910 - ĐML_STR_STR - 99 Hùng Vương', 'NGƯỜI THÂN', 'Nam'],
    ['21708', 'Lê Thị Cúc', '8871 - DMS3_STR_LPH - Thừa 674 Tân Thạnh', 'NHÂN VIÊN', 'Nữ'],
    ['Ba/Mẹ', 'Nguyễn Văn Hùng', '8871 - DMS3_STR_LPH - Thừa 674 Tân Thạnh', 'NGƯỜI THÂN', 'Nam'],
    ['PG', 'Phạm Hoàng Yến', '8871 - DMS3_STR_LPH - Thừa 674 Tân Thạnh', 'PG', 'Nữ']
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(templateHeaders);
  ws1['!cols'] = [
    { wch: 18 }, // USER
    { wch: 28 }, // HỌ TÊN THAM GIA
    { wch: 42 }, // MST - TÊN SIÊU THỊ
    { wch: 26 }, // NHÂN VIÊN / NGƯỜI THÂN
    { wch: 14 }  // GIỚI TÍNH
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'DANH SÁCH MẪU');

  // Sheet 2: HƯỚNG DẪN QUY ƯỚC
  const guideData = [
    ['HƯỚNG DẪN ĐIỀN DỮ LIỆU FILE EXCEL DANH SÁCH ĐOÀN DU LỊCH'],
    [''],
    ['CỘT', 'TÊN CỘT', 'QUY ƯỚC VÀ GIÁ TRỊ MẪU', 'MÔ TẢ'],
    ['A', 'USER', 'Mã nhân viên (vd: 21707) HOẶC loại quan hệ người thân: Vợ/Chồng, Con dưới 5 Tuổi, Con 5-11 Tuổi, Con từ 12 Tuổi, Ba/Mẹ, PG', 'Dùng để định danh nhân viên hoặc xác định suất của người thân.'],
    ['B', 'HỌ TÊN THAM GIA', 'Họ và tên đầy đủ (vd: Nguyễn Văn An)', 'Tên hiển thị để tìm kiếm và xếp phòng.'],
    ['C', 'MST - TÊN SIÊU THỊ', 'Tên hoặc mã siêu thị/phòng ban (vd: 910 - ĐML_STR_STR - 99 Hùng Vương)', 'Người cùng siêu thị sẽ được ưu tiên xếp chung phòng.'],
    ['D', 'NHÂN VIÊN / NGƯỜI THÂN', 'Điền 1 trong 3 giá trị: NHÂN VIÊN, NGƯỜI THÂN, PG', 'Xác định tư cách tham gia của thành viên.'],
    ['E', 'GIỚI TÍNH', 'Điền "Nam" hoặc "Nữ"', 'Dùng để kiểm soát quy tắc cùng giới và xếp giường.']
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(guideData);
  ws2['!cols'] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 45 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'HƯỚNG DẪN');

  XLSX.writeFile(wb, 'Mau_Danh_Sach_Nhan_Su_Chuyen_Di.xlsx');
}
