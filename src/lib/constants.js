// Danh sách bộ phận nhà máy RG1
export const RG1_DEPARTMENTS = [
  '1U01', '1U02', '1U03', '1U04', '1U05',
  '1K01', '1W01', '1MT1',
  'Dorm', 'Public_area'
]

// Hạng mục kiểm tra
export const INSPECTION_CATEGORIES = [
  'An toàn phòng chống cháy nổ',
  'An toàn chung tại nơi làm việc',
  'An toàn điện',
  'An toàn máy & thiết bị',
  'PPE',
  'Biển cảnh báo, poster an toàn, bảng tin',
  'An toàn hóa chất',
  'Thiết bị, phương tiện có yêu cầu nghiêm ngặt',
  'Khác',
]

// Mức độ nghiêm trọng
export const SEVERITY_LEVELS = [
  { value: 'Critical', label: 'Critical (E-4)', color: '#dc2626', bg: '#fee2e2', border: '#fecaca' },
  { value: 'High',     label: 'High (D-3)',     color: '#ea580c', bg: '#ffedd5', border: '#fed7aa' },
  { value: 'Medium',   label: 'Medium (C-2)',   color: '#ca8a04', bg: '#fef9c3', border: '#fde68a' },
  { value: 'Low',      label: 'Low (B-1)',      color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
]

// Map từ label đầy đủ sang giá trị ngắn
export const SEVERITY_MAP = {
  'Rất nghiêm trọng - Critical risk - E- 4': 'Critical',
  'Nghiêm trọng - High risk - D - 3': 'High',
  'Trung bình - Medium risk - C -2': 'Medium',
  'Thấp - Low risk - B - 1': 'Low',
}

// Trạng thái CAP
export const CAP_STATUSES = [
  { value: 'Chưa xử lý',  label: 'Chưa xử lý',  className: 'status-open',       icon: '🔴' },
  { value: 'Đang xử lý',  label: 'Đang xử lý',  className: 'status-inprogress', icon: '🔵' },
  { value: 'Chờ duyệt',   label: 'Chờ duyệt',   className: 'status-pending',    icon: '🟡' },
  { value: 'Đã đóng',     label: 'Đã đóng',     className: 'status-closed',     icon: '🟢' },
]

// Màu sắc biểu đồ cho hạng mục
export const CATEGORY_COLORS = [
  '#1e40af', '#dc2626', '#f59e0b', '#10b981',
  '#8b5cf6', '#f97316', '#06b6d4', '#84cc16', '#ec4899'
]

// Google Sheet config
export const GSHEET_ID = import.meta.env.VITE_GSHEET_ID
export const GSHEET_GID = import.meta.env.VITE_GSHEET_GID

// Parse severity từ label đầy đủ
export function parseSeverity(rawLabel) {
  if (!rawLabel) return 'Medium'
  for (const [key, val] of Object.entries(SEVERITY_MAP)) {
    if (rawLabel.includes('Critical')) return 'Critical'
    if (rawLabel.includes('High')) return 'High'
    if (rawLabel.includes('Medium') || rawLabel.includes('Trung bình')) return 'Medium'
    if (rawLabel.includes('Low') || rawLabel.includes('Thấp')) return 'Low'
  }
  return 'Medium'
}

// Lấy config severity
export function getSeverityConfig(severity) {
  return SEVERITY_LEVELS.find(s => s.value === severity) || SEVERITY_LEVELS[2]
}

// Lấy config CAP status
export function getCapStatusConfig(status) {
  return CAP_STATUSES.find(s => s.value === status) || CAP_STATUSES[0]
}
