import { supabase } from './supabase'
import { parseSeverity, GSHEET_ID, GSHEET_GID } from './constants'

// =============================================
// VIOLATIONS CRUD
// =============================================

export async function fetchViolations({ department, severity, capStatus, month, year } = {}) {
  let query = supabase
    .from('violations')
    .select('*')
    .order('inspection_date', { ascending: false })

  if (department && department !== 'all') {
    query = query.eq('department', department)
  }
  if (severity && severity !== 'all') {
    query = query.eq('severity', severity)
  }
  if (capStatus && capStatus !== 'all') {
    query = query.eq('cap_status', capStatus)
  }
  if (month && year) {
    const start = new Date(year, month - 1, 1).toISOString()
    const end   = new Date(year, month, 0, 23, 59, 59).toISOString()
    query = query.gte('inspection_date', start).lte('inspection_date', end)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function fetchViolationById(id) {
  const { data, error } = await supabase
    .from('violations')
    .select('*, cap_updates(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createViolation(violation) {
  const { data, error } = await supabase
    .from('violations')
    .insert([violation])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateViolation(id, updates) {
  const { data, error } = await supabase
    .from('violations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteViolation(id) {
  // Delete CAP history first (foreign key)
  await supabase.from('cap_updates').delete().eq('violation_id', id)
  const { error } = await supabase.from('violations').delete().eq('id', id)
  if (error) throw error
}

export async function updateCapStatus(id, newStatus, note, updatedBy, evidenceUrl) {
  // Get current status for history
  const { data: current } = await supabase
    .from('violations')
    .select('cap_status')
    .eq('id', id)
    .single()

  const oldStatus = current?.cap_status

  // Update violation
  const updates = { cap_status: newStatus, cap_note: note }
  if (newStatus === 'Đã đóng') {
    updates.closed_at = new Date().toISOString()
  } else {
    updates.closed_at = null
  }
  if (evidenceUrl) updates.evidence_url = evidenceUrl

  await updateViolation(id, updates)

  // Log history
  await supabase.from('cap_updates').insert([{
    violation_id: id,
    old_status: oldStatus,
    new_status: newStatus,
    note,
    evidence_url: evidenceUrl || null,
    updated_by: updatedBy || 'HSE Team',
  }])
}

// =============================================
// DASHBOARD STATS
// =============================================

export async function fetchDashboardStats({ month, year } = {}) {
  let query = supabase.from('violations').select('severity, cap_status, department, inspection_category')

  if (month && year) {
    const start = new Date(year, month - 1, 1).toISOString()
    const end   = new Date(year, month, 0, 23, 59, 59).toISOString()
    query = query.gte('inspection_date', start).lte('inspection_date', end)
  }

  const { data, error } = await query
  if (error) throw error

  const violations = data || []
  const total = violations.length

  // By severity
  const bySeverity = { Critical: 0, High: 0, Medium: 0, Low: 0 }
  violations.forEach(v => { if (v.severity) bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1 })

  // By CAP status
  const byCapStatus = {}
  violations.forEach(v => {
    const s = v.cap_status || 'Chưa xử lý'
    byCapStatus[s] = (byCapStatus[s] || 0) + 1
  })

  // By department: total + closed rate
  const byDept = {}
  violations.forEach(v => {
    const d = v.department || 'Khác'
    if (!byDept[d]) byDept[d] = { total: 0, closed: 0 }
    byDept[d].total++
    if (v.cap_status === 'Đã đóng') byDept[d].closed++
  })

  // By category
  const byCategory = {}
  violations.forEach(v => {
    const c = v.inspection_category || 'Khác'
    byCategory[c] = (byCategory[c] || 0) + 1
  })

  const closedCount = byCapStatus['Đã đóng'] || 0
  const capRate = total > 0 ? Math.round((closedCount / total) * 100) : 0

  return { total, bySeverity, byCapStatus, byDept, byCategory, capRate, violations }
}

// =============================================
// RECENT IMAGES (for rolling panel)
// =============================================

export async function fetchRecentViolationsWithImages(limit = 10) {
  const { data, error } = await supabase
    .from('violations')
    .select('id, department, inspection_category, violation_detail, severity, inspection_date, evidence_url, image_path')
    .not('evidence_url', 'is', null)
    .order('inspection_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// =============================================
// IMPORT FROM GOOGLE SHEET
// =============================================

export async function importFromGoogleSheet() {
  const sheetId = GSHEET_ID
  const gid = GSHEET_GID
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`

  const response = await fetch(csvUrl)
  if (!response.ok) throw new Error('Không thể tải dữ liệu từ Google Sheet')

  const csvText = await response.text()
  const rows = parseCSV(csvText)
  if (rows.length < 2) throw new Error('Sheet không có dữ liệu')

  const headers = rows[0]
  const violations = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row[0]) continue // skip empty rows

    const obj = {}
    headers.forEach((h, idx) => { obj[h.trim()] = (row[idx] || '').trim() })

    const auditId        = obj['Internal safety audit ID'] || obj[headers[0]]
    const inspectionDate = obj['Ngày giờ kiểm tra'] || obj[headers[1]]
    const inspector      = obj['Người kiểm tra'] || obj[headers[2]]
    const department     = obj['Bộ phận/khu vực kiểm tra'] || obj[headers[3]]
    const category       = obj['Hạng mục kiểm tra'] || obj[headers[4]]
    const detail         = obj['Chi tiết vi phạm/ điểm chưa tuân thủ'] || obj[headers[5]]
    const responsibleDept= obj['Phòng ban chịu trách nhiệm/ xử lý'] || obj[headers[6]]
    const dueDate        = obj['Thời hạn xử lý'] || obj[headers[7]]
    const severityRaw    = obj['Mức độ nghiêm trọng'] || obj[headers[8]]
    const recorder       = obj['Người ghi nhận / duyệt'] || obj[headers[9]]
    const imagePath      = obj[headers[10]] || ''

    if (!auditId) continue

    violations.push({
      audit_id: auditId,
      inspection_date: parseDate(inspectionDate),
      inspector,
      department,
      inspection_category: category,
      violation_detail: detail,
      responsible_dept: responsibleDept,
      due_date: parseDate(dueDate),
      severity: parseSeverity(severityRaw),
      severity_label: severityRaw,
      recorder,
      image_path: imagePath,
      factory: 'RG1', // default, filtering happens in app
    })
  }

  // Upsert into Supabase
  const { data, error } = await supabase
    .from('violations')
    .upsert(violations, { onConflict: 'audit_id', ignoreDuplicates: false })
    .select()

  if (error) throw error
  return { imported: violations.length, data }
}

// =============================================
// UPLOAD EVIDENCE IMAGE
// =============================================

export async function uploadEvidenceImage(file, violationId) {
  // Sanitize filename: remove special chars, keep extension
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const safeName = `${Date.now()}.${ext}`
  const path = `evidence/${violationId}/${safeName}`

  const { data, error } = await supabase.storage
    .from('hse-images')
    .upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    })

  if (error) {
    // Provide clearer error messages
    if (error.message?.includes('Bucket not found')) {
      throw new Error('Storage bucket chưa được tạo. Liên hệ quản trị viên.')
    }
    if (error.message?.includes('not authorized') || error.message?.includes('policy')) {
      throw new Error('Không có quyền upload. Kiểm tra cấu hình Supabase Storage.')
    }
    throw new Error(error.message || 'Upload thất bại')
  }

  const { data: urlData } = supabase.storage
    .from('hse-images')
    .getPublicUrl(path)

  return urlData.publicUrl
}

// Convert Google Drive share link to direct image URL
export function driveShareToDirectUrl(shareUrl) {
  if (!shareUrl) return shareUrl
  // Handle: https://drive.google.com/file/d/FILE_ID/view?...
  const fileMatch = shareUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) {
    return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`
  }
  // Handle: https://drive.google.com/open?id=FILE_ID
  const openMatch = shareUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (openMatch) {
    return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`
  }
  return shareUrl
}

// =============================================
// HELPERS
// =============================================

function parseDate(str) {
  if (!str) return null
  // Handle M/D/YYYY format
  const parts = str.split('/')
  if (parts.length === 3) {
    const [m, d, y] = parts
    const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    if (!isNaN(dt.getTime())) return dt.toISOString()
  }
  const dt = new Date(str)
  if (!isNaN(dt.getTime())) return dt.toISOString()
  return null
}

function parseCSV(text) {
  const rows = []
  const lines = text.split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    const row = []
    let inQuote = false
    let cell = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        row.push(cell)
        cell = ''
      } else {
        cell += ch
      }
    }
    row.push(cell)
    rows.push(row)
  }
  return rows
}
