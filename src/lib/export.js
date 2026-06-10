import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function computeStats(violations) {
  const total = violations.length
  const bySeverity = { Critical: 0, High: 0, Medium: 0, Low: 0 }
  const byCapStatus = {}
  const byDept = {}

  violations.forEach(v => {
    if (v.severity) bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1
    const s = v.cap_status || 'Chưa xử lý'
    byCapStatus[s] = (byCapStatus[s] || 0) + 1
    const d = v.department || 'Khác'
    if (!byDept[d]) byDept[d] = { total: 0, closed: 0 }
    byDept[d].total++
    if (v.cap_status === 'Đã đóng') byDept[d].closed++
  })

  const closed = byCapStatus['Đã đóng'] || 0
  const capRate = total > 0 ? Math.round((closed / total) * 100) : 0
  return { total, bySeverity, byCapStatus, byDept, capRate, closed }
}

// ─── SEVERITY STYLES ──────────────────────────────────────────────────────────
const SEV_STYLE = {
  Critical: 'background:#fee2e2;color:#dc2626;border:1px solid #fecaca',
  High:     'background:#ffedd5;color:#ea580c;border:1px solid #fed7aa',
  Medium:   'background:#fef9c3;color:#ca8a04;border:1px solid #fde68a',
  Low:      'background:#dcfce7;color:#16a34a;border:1px solid #bbf7d0',
}

// ─── CAP STATUS STYLE ─────────────────────────────────────────────────────────
const CAP_STYLE = {
  'Chưa xử lý': 'background:#fee2e2;color:#dc2626',
  'Đang xử lý': 'background:#dbeafe;color:#1d4ed8',
  'Chờ duyệt':  'background:#fef9c3;color:#ca8a04',
  'Đã đóng':    'background:#dcfce7;color:#16a34a',
}

// ─── HTML: PAGE 1 — DASHBOARD ─────────────────────────────────────────────────
function buildDashboardHTML(stats, filterLabel) {
  const now = new Date().toLocaleString('vi-VN')

  const severityRows = Object.entries(stats.bySeverity)
    .map(([k, v]) => `
      <tr>
        <td><span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;${SEV_STYLE[k] || ''}">${k}</span></td>
        <td style="text-align:center;font-weight:700">${v}</td>
        <td style="text-align:center">${stats.total > 0 ? Math.round(v / stats.total * 100) : 0}%</td>
      </tr>`).join('')

  const capRows = Object.entries(stats.byCapStatus)
    .map(([k, v]) => `
      <tr>
        <td><span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;${CAP_STYLE[k] || 'background:#f1f5f9;color:#334155'}">${k}</span></td>
        <td style="text-align:center;font-weight:700">${v}</td>
        <td style="text-align:center">${stats.total > 0 ? Math.round(v / stats.total * 100) : 0}%</td>
      </tr>`).join('')

  const deptRows = Object.entries(stats.byDept)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([dept, data]) => `
      <tr>
        <td style="font-weight:600">${dept}</td>
        <td style="text-align:center;font-weight:700">${data.total}</td>
        <td style="text-align:center">${data.closed}</td>
        <td style="text-align:center">${data.total > 0 ? Math.round(data.closed / data.total * 100) : 0}%</td>
      </tr>`).join('')

  return `
    <div style="font-family:'Segoe UI',Arial,'Helvetica Neue',sans-serif;font-size:12px;color:#1e293b;background:white;padding:0">
      <!-- Header -->
      <div style="background:#1e3a8a;color:white;padding:18px 24px">
        <div style="font-size:16px;font-weight:700;letter-spacing:0.5px">HSE MONITOR — BÁO CÁO AN TOÀN</div>
        <div style="font-size:11px;color:#bfdbfe;margin-top:4px">Nhà máy RG1 · Công ty TNHH May Tinh Lợi · Xuất lúc: ${now}</div>
      </div>
      <div style="height:4px;background:linear-gradient(to right,#dc2626,#ef4444,#dc2626)"></div>

      <div style="padding:20px 24px">
        ${filterLabel ? `<div style="font-size:11px;color:#64748b;margin-bottom:16px">🔍 Bộ lọc: <strong>${filterLabel}</strong></div>` : ''}

        <!-- KPI Cards -->
        <div style="display:flex;gap:12px;margin-bottom:24px">
          ${[
            { label: 'Tổng vi phạm', value: stats.total, color: '#1d4ed8', bg: '#eff6ff' },
            { label: 'Critical',     value: stats.bySeverity.Critical || 0, color: '#dc2626', bg: '#fef2f2' },
            { label: 'Đã đóng',      value: stats.closed, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Tỷ lệ CAP',    value: stats.capRate + '%', color: '#b45309', bg: '#fffbeb' },
          ].map(k => `
            <div style="flex:1;background:${k.bg};border-radius:10px;padding:14px;text-align:center;border:1px solid ${k.bg}">
              <div style="font-size:26px;font-weight:800;color:${k.color}">${k.value}</div>
              <div style="font-size:11px;color:#64748b;margin-top:4px">${k.label}</div>
            </div>`).join('')}
        </div>

        <!-- 2-column grid -->
        <div style="display:flex;gap:20px;margin-bottom:20px">
          <!-- Severity table -->
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:#1e3a8a;margin-bottom:8px">Vi phạm theo mức độ</div>
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              <thead>
                <tr style="background:#1e3a8a;color:white">
                  <th style="padding:7px 10px;text-align:left;border-radius:4px 0 0 0">Mức độ</th>
                  <th style="padding:7px 10px;text-align:center">Số lượng</th>
                  <th style="padding:7px 10px;text-align:center;border-radius:0 4px 0 0">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>${severityRows}</tbody>
            </table>
          </div>
          <!-- CAP status table -->
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:#1e3a8a;margin-bottom:8px">Trạng thái CAP</div>
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              <thead>
                <tr style="background:#1e3a8a;color:white">
                  <th style="padding:7px 10px;text-align:left">Trạng thái</th>
                  <th style="padding:7px 10px;text-align:center">Số lượng</th>
                  <th style="padding:7px 10px;text-align:center">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>${capRows}</tbody>
            </table>
          </div>
        </div>

        <!-- Department table -->
        <div>
          <div style="font-size:13px;font-weight:700;color:#1e3a8a;margin-bottom:8px">Vi phạm theo bộ phận / khu vực</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead>
              <tr style="background:#1e3a8a;color:white">
                <th style="padding:7px 10px;text-align:left">Bộ phận</th>
                <th style="padding:7px 10px;text-align:center">Tổng</th>
                <th style="padding:7px 10px;text-align:center">Đã đóng</th>
                <th style="padding:7px 10px;text-align:center">Tỷ lệ đóng</th>
              </tr>
            </thead>
            <tbody>${deptRows}</tbody>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:8px 24px;font-size:10px;color:#94a3b8;text-align:center">
        HSE Monitor · Nhà máy RG1 · Trang 1
      </div>
    </div>`
}

// ─── HTML: PAGE 2 — VIOLATIONS TABLE ─────────────────────────────────────────
function buildViolationsHTML(violations, filterLabel) {
  const now = new Date().toLocaleString('vi-VN')

  const rows = violations.map((v, idx) => {
    const imgSrc = v.evidence_url || v.image_path || ''
    const imgCell = imgSrc
      ? `<img src="${imgSrc}" style="max-width:80px;max-height:60px;object-fit:contain;border-radius:4px;border:1px solid #e2e8f0" crossorigin="anonymous" onerror="this.style.display='none';this.nextSibling.style.display='block'">`
        + `<span style="display:none;font-size:10px;color:#94a3b8">Không tải được ảnh</span>`
      : '<span style="color:#94a3b8;font-size:10px">Không có ảnh</span>'

    const isOverdue = v.due_date && v.cap_status !== 'Đã đóng' && new Date(v.due_date) < new Date()
    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'

    return `
      <tr style="background:${rowBg};border-bottom:1px solid #f1f5f9">
        <td style="padding:8px;text-align:center;font-weight:600;color:#64748b">${idx + 1}</td>
        <td style="padding:8px;font-weight:600">${v.department || '—'}</td>
        <td style="padding:8px;line-height:1.4">${v.violation_detail || '—'}</td>
        <td style="padding:8px;text-align:center">
          <span style="padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;${SEV_STYLE[v.severity] || 'background:#f1f5f9;color:#334155'}">${v.severity || '—'}</span>
        </td>
        <td style="padding:8px;text-align:center">${imgCell}</td>
        <td style="padding:8px">${v.responsible_dept || v.inspector || '—'}</td>
        <td style="padding:8px;text-align:center;${isOverdue ? 'color:#dc2626;font-weight:700' : 'color:#64748b'}">${fmtDate(v.due_date)}${isOverdue ? '<br><span style="font-size:9px">⚠️ Quá hạn</span>' : ''}</td>
      </tr>`
  }).join('')

  return `
    <div style="font-family:'Segoe UI',Arial,'Helvetica Neue',sans-serif;font-size:11px;color:#1e293b;background:white;padding:0">
      <!-- Header -->
      <div style="background:#1e3a8a;color:white;padding:16px 20px">
        <div style="font-size:15px;font-weight:700">DANH SÁCH ĐIỂM CHƯA TUÂN THỦ</div>
        <div style="font-size:10px;color:#bfdbfe;margin-top:4px">RG1 · ${violations.length} vi phạm · ${now}${filterLabel ? ' · ' + filterLabel : ''}</div>
      </div>
      <div style="height:3px;background:linear-gradient(to right,#dc2626,#ef4444,#dc2626)"></div>

      <div style="padding:16px 20px">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#1e3a8a;color:white;font-size:11px">
              <th style="padding:8px 6px;text-align:center;width:32px">#</th>
              <th style="padding:8px 6px;text-align:left;width:70px">Bộ phận</th>
              <th style="padding:8px 6px;text-align:left">Chi tiết vi phạm</th>
              <th style="padding:8px 6px;text-align:center;width:72px">Mức độ</th>
              <th style="padding:8px 6px;text-align:center;width:90px">Hình ảnh</th>
              <th style="padding:8px 6px;text-align:left;width:100px">Người phụ trách</th>
              <th style="padding:8px 6px;text-align:center;width:76px">Hạn xử lý</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:8px 20px;font-size:10px;color:#94a3b8;text-align:center">
        HSE Monitor · Nhà máy RG1 · Trang 2
      </div>
    </div>`
}

// ─── CANVAS → PDF (auto-pagination) ──────────────────────────────────────────
function canvasToPDFPages(pdf, canvas, isFirstPage = false) {
  const A4_W_MM = 210
  const A4_H_MM = 297
  const scale = canvas.width / A4_W_MM           // px per mm
  const pageHeightPx = A4_H_MM * scale

  let offsetY = 0
  let pageIndex = 0

  while (offsetY < canvas.height) {
    if (!isFirstPage || pageIndex > 0) pdf.addPage()

    const sliceH = Math.min(pageHeightPx, canvas.height - offsetY)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceH

    const ctx = pageCanvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)

    const imgData = pageCanvas.toDataURL('image/jpeg', 0.92)
    const renderedMM = sliceH / scale
    pdf.addImage(imgData, 'JPEG', 0, 0, A4_W_MM, renderedMM)

    offsetY += pageHeightPx
    pageIndex++
  }
}

// ─── EXPORT PDF ────────────────────────────────────────────────────────────────
export async function exportToPDF(violations, filterLabel = '') {
  const stats = computeStats(violations)

  // Container hidden offscreen
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;z-index:-1'
  document.body.appendChild(wrap)

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  try {
    // ── Page 1: Dashboard ──
    const div1 = document.createElement('div')
    div1.innerHTML = buildDashboardHTML(stats, filterLabel)
    wrap.appendChild(div1)

    const canvas1 = await html2canvas(div1, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    })
    canvasToPDFPages(pdf, canvas1, true)
    wrap.removeChild(div1)

    // ── Page 2+: Violations ──
    const div2 = document.createElement('div')
    div2.innerHTML = buildViolationsHTML(violations, filterLabel)
    wrap.appendChild(div2)

    // Wait for images to load
    const imgs = div2.querySelectorAll('img')
    if (imgs.length > 0) {
      await Promise.all(Array.from(imgs).map(img =>
        new Promise(resolve => {
          if (img.complete) return resolve()
          img.onload = resolve
          img.onerror = resolve
          setTimeout(resolve, 4000) // fallback timeout
        })
      ))
    }

    const canvas2 = await html2canvas(div2, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    })
    canvasToPDFPages(pdf, canvas2, false)
    wrap.removeChild(div2)

  } finally {
    document.body.removeChild(wrap)
  }

  const filename = `HSE_Report_RG1_${new Date().toISOString().slice(0, 10)}.pdf`
  pdf.save(filename)
}

// ─── EXPORT EXCEL ──────────────────────────────────────────────────────────────
export function exportToExcel(violations, filterLabel = '') {
  const stats = computeStats(violations)
  const now = new Date().toLocaleDateString('vi-VN')
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Dashboard ──────────────────────────────────────────────────────
  const dashRows = [
    ['BÁO CÁO HSE MONITOR — NHÀ MÁY RG1'],
    ['Công ty TNHH May Tinh Lợi'],
    filterLabel ? [`Bộ lọc: ${filterLabel}`] : [`Ngày xuất: ${now}`],
    [],
    ['TỔNG QUAN'],
    ['Chỉ số', 'Giá trị'],
    ['Tổng vi phạm', stats.total],
    ['Đã đóng', stats.closed],
    ['Tỷ lệ CAP', `${stats.capRate}%`],
    [],
    ['VI PHẠM THEO MỨC ĐỘ'],
    ['Mức độ', 'Số lượng', 'Tỷ lệ'],
    ...Object.entries(stats.bySeverity).map(([k, v]) => [
      k, v, stats.total > 0 ? `${Math.round(v / stats.total * 100)}%` : '0%'
    ]),
    [],
    ['TRẠNG THÁI KHẮC PHỤC (CAP)'],
    ['Trạng thái', 'Số lượng', 'Tỷ lệ'],
    ...Object.entries(stats.byCapStatus).map(([k, v]) => [
      k, v, stats.total > 0 ? `${Math.round(v / stats.total * 100)}%` : '0%'
    ]),
    [],
    ['VI PHẠM THEO BỘ PHẬN'],
    ['Bộ phận', 'Tổng', 'Đã đóng', 'Tỷ lệ đóng'],
    ...Object.entries(stats.byDept)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([dept, data]) => [
        dept,
        data.total,
        data.closed,
        data.total > 0 ? `${Math.round(data.closed / data.total * 100)}%` : '0%',
      ]),
  ]
  const wsDash = XLSX.utils.aoa_to_sheet(dashRows)
  wsDash['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, wsDash, 'Dashboard')

  // ── Sheet 2: Violations ─────────────────────────────────────────────────────
  const headers = [
    'STT', 'Audit ID', 'Ngày kiểm tra',
    'Bộ phận / Khu vực', 'Hạng mục kiểm tra',
    'Chi tiết vi phạm / điểm chưa tuân thủ',
    'Mức độ nghiêm trọng',
    'Người kiểm tra', 'Người phụ trách xử lý',
    'Link hình ảnh vi phạm',
    'Thời hạn xử lý', 'Trạng thái CAP',
    'Ngày đóng',
  ]
  const rows = violations.map((v, idx) => [
    idx + 1,
    v.audit_id || '',
    fmtDate(v.inspection_date),
    v.department || '',
    v.inspection_category || '',
    v.violation_detail || '',
    v.severity || '',
    v.inspector || '',
    v.responsible_dept || '',
    v.evidence_url || v.image_path || '',
    fmtDate(v.due_date),
    v.cap_status || '',
    fmtDate(v.closed_at),
  ])
  const wsVio = XLSX.utils.aoa_to_sheet([headers, ...rows])
  wsVio['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 14 },
    { wch: 16 }, { wch: 24 },
    { wch: 50 },
    { wch: 12 },
    { wch: 20 }, { wch: 20 },
    { wch: 50 },
    { wch: 14 }, { wch: 16 },
    { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, wsVio, 'Vi phạm')

  const filename = `HSE_Report_RG1_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, filename)
}
