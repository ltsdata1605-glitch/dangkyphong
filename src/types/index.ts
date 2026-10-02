export type Gender = 'M' | 'F';

export type PersonType = 'EMPLOYEE' | 'RELATIVE' | 'PG';

export type RelationType =
  | 'SPOUSE'      // Vợ/Chồng
  | 'PARENT'      // Ba/Mẹ
  | 'CHILD_U5'    // Con dưới 5 tuổi (0 slot)
  | 'CHILD_5_11'  // Con 5-11 tuổi (0 slot)
  | 'CHILD_12P'   // Con >= 12 tuổi (1 slot)
  | 'PG'          // PG độc lập (1 slot)
  | 'OTHER';      // Quan hệ khác / người thân chưa phân loại

export interface Person {
  id: string;
  code: string;            // MSNV (e.g. "20894") hoặc mã người thân ("20894-NT1", "NT001")
  name: string;
  nameUnsigned: string;    // Tên không dấu chữ thường (dùng tìm kiếm nhanh)
  store: string;           // Siêu thị (e.g. "7195 - ĐMS_HGI_CTA - Chợ Một Ngàn")
  type: PersonType;
  relation: RelationType | null;
  gender: Gender;
  ownerId: string | null;  // MSNV của nhân viên bảo trợ (nếu là người thân)
  slot: number;            // 1: người lớn, 0: trẻ em < 12
  roomId: string | null;   // ID phòng đang ở
  phone?: string;
  birthYear?: number;
  note?: string;
}

export type BedType = 'DOUBLE' | 'TWIN' | 'TRIPLE' | 'FAMILY' | 'EXTRA_BED';

export type RoomStatus = 'FULL' | 'UNDER' | 'WARNING';

export interface Room {
  id: string;
  tripId: string;
  code: string;            // e.g. "P.1" hoặc "R001"
  capacity: number;        // 2, 3, 4, 5, 6 (suất người lớn)
  leaderId: string;        // ID của trưởng phòng
  memberIds: string[];     // Danh sách ID thành viên trong phòng
  usedSlots: number;       // Tổng số suất người lớn đã dùng
  childCount: number;      // Tổng số trẻ em < 12 tuổi ở ghép
  status: RoomStatus;
  bedType: BedType;
  adminOverride: boolean;  // Có phải Admin bỏ qua quy tắc không
  adminNote?: string;      // Ghi chú lý do Admin bỏ qua quy tắc
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Trip {
  id: string;
  name: string;            // Tên chuyến đi (vd: "Đoàn Phú Quốc Đợt 1 - Tháng 10/2026")
  hotelName: string;
  location: string;
  startDate: string;
  endDate: string;
  deadline: string;        // Hạn chót đăng ký (ISO string)
  isLocked: boolean;       // Admin khóa thủ công
  maxChildrenPerRoom: number; // Mặc định: 2
  roomLimits?: Record<number, number>; // Giới hạn số lượng phòng tối đa theo từng loại (2, 3, 4, 5, 6 người)
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tripId: string;
  action: 'CREATE_ROOM' | 'UPDATE_ROOM' | 'LEAVE_ROOM' | 'DELETE_ROOM' | 'ASSIGN_RELATIVE' | 'AUTO_MATCH' | 'IMPORT_EXCEL' | 'OVERRIDE';
  actor: string;           // MSNV hoặc "Admin"
  actorName: string;
  details: string;
  timestamp: string;
}

export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  bedType: BedType;
  usedSlots: number;
  childCount: number;
}
