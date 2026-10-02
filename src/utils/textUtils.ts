import { Gender, RelationType } from '../types';

/**
 * Chuyển tiếng Việt có dấu thành không dấu chữ thường để tìm kiếm
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
  str = str.replace(/\u02C6|\u0306|\u031B/g, '');
  return str.trim();
}

/**
 * Đoán giới tính dựa vào tên đệm và mối quan hệ
 */
export function inferGender(name: string, relation?: RelationType | null, employeeGender?: Gender): Gender {
  // Nếu là vợ/chồng và có thông tin giới tính nhân viên bảo trợ -> lấy ngược lại
  if (relation === 'SPOUSE' && employeeGender) {
    return employeeGender === 'M' ? 'F' : 'M';
  }

  const unsigned = removeVietnameseTones(name);

  // Nhận diện theo tên đệm/tên phổ biến của Nữ
  const femaleKeywords = ['thi', 'nu', 'loan', 'hang', 'ngoc', 'linh', 'trinh', 'oanh', 'trang', 'thao', 'my', 'quynh', 'huong', 'dung', 'nhu', 'men', 'nuong', 'kieu', 'thuy'];
  // Nhận diện theo tên Nam
  const maleKeywords = ['van', 'hung', 'phuc', 'quang', 'huy', 'nhan', 'vuong', 'trung', 'thanh', 'nam', 'khoi', 'tuan', 'bao', 'trieu', 'dat', 'minh', 'luong', 'dang'];

  for (const kw of femaleKeywords) {
    if (unsigned.includes(kw)) return 'F';
  }

  for (const kw of maleKeywords) {
    if (unsigned.includes(kw)) return 'M';
  }

  return 'M'; // Mặc định nếu không rõ
}

/**
 * Định dạng thời gian còn lại
 */
export function formatRemainingTime(deadlineIso: string): { text: string; isExpired: boolean; hoursLeft: number } {
  const now = new Date().getTime();
  const deadline = new Date(deadlineIso).getTime();
  const diff = deadline - now;

  if (diff <= 0) {
    return { text: 'Đã hết hạn đăng ký', isExpired: true, hoursLeft: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return { text: `Còn ${days} ngày ${hours} giờ`, isExpired: false, hoursLeft: diff / (1000 * 60 * 60) };
  }
  return { text: `Còn ${hours} giờ ${minutes} phút`, isExpired: false, hoursLeft: diff / (1000 * 60 * 60) };
}

/**
 * Sinh mã ngẫu nhiên ngắn
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}
