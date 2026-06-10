// =============================================
// AUTH MODULE — Client-side role management
// Roles: null (chưa đăng nhập) | 'guest' | 'admin'
// =============================================

const STORAGE_KEY = 'hse_role'

// Thông tin admin — chỉ lưu client-side (không commit lên GitHub)
const ADMIN_USERNAME = 'susrg1'
const ADMIN_PASSWORD = 'susrg1'

export function getRole() {
  return localStorage.getItem(STORAGE_KEY) || null
}

export function isAdmin() {
  return getRole() === 'admin'
}

export function isGuest() {
  return getRole() === 'guest'
}

export function isLoggedIn() {
  return getRole() !== null
}

export function loginAsGuest() {
  localStorage.setItem(STORAGE_KEY, 'guest')
}

export function loginAsAdmin(username, password) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    localStorage.setItem(STORAGE_KEY, 'admin')
    return true
  }
  return false
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY)
}
