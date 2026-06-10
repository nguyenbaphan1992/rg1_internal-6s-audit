import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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

function imageCell(v) {
  if (v.evidence_url) return v.evidence_url
  if (v.image_path) return v.image_path
  return '—'
}

// ─── EXPORT PDF ────────────────────────────────────────────────────────────────
export function exportToPDF(violations, filterLabel = '') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const stats = computeStats(violations)
  const now = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const BLUE = [30, 64, 175]    // blue-800
  const RED  = [220, 38, 38]    // red-600
  const GRAY = [71, 85, 105]    // slate-600

  // ── PAGE 1: DASHBOARD ──────────────────────────────────────────────────────
  // Header bar
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setFillColor(...RED)
  doc.rect(0, 22, 210, 2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('HSE MONITOR — BÁO CÁO AN TOÀN', 105, 10, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nhà máy RG1 · Công ty TNHH May Tinh Lợi · Xuất lúc: ${now}`, 105, 17, { align: 'center' })

  let y = 32

  // Filter label
  if (filterLabel) {
    doc.setTextColor(...GRAY)
    doc.setFontSize(9)
    doc.text(`Bộ lọc: ${filterLabel}`, 14, y)
    y += 7
  }

  // KPI row
  const kpis = [
    { label: 'Tổng vi phạm', value: String(stats.total), color: BLUE },
    { label: 'Critical', value: String(stats.bySeverity.Critical || 0), color: RED },
    { label: 'Đã đóng', value: String(stats.closed), color: [22, 163, 74] },
    { label: 'Tỷ lệ CAP', value: `${stats.capRate}%`, color: [202, 138, 4] },
  ]

  const boxW = 43
  const boxH = 18
  kpis.forEach((kpi, i) => {
    const x = 14 + i * (boxW + 3)
    doc.setFillColor(245, 247, 250)
    doc.roundedRect(x, y, boxW, boxH, 2, 2, 'F')
    doc.setDrawColor(220, 220, 230)
    doc.roundedRect(x, y, boxW, boxH, 2, 2, 'S')
    doc.setTextColor(...kpi.color)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(kpi.value, x + boxW / 2, y + 11, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(kpi.label, x + boxW / 2, y + 16, { align: 'center' })
  })
  y += boxH + 8

  // Section: By Severity
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('Vi phạm theo mức độ nghiêm trọng', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    head: [['Mức độ', 'Số lượng', 'Tỷ lệ']],
    body: Object.entries(stats.bySeverity).map(([k, v]) => [
      k, v, stats.total > 0 ? `${Math.round(v / stats.total * 100)}%` : '0%'
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    tableWidth: 80,
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 8

  // Section: By CAP Status
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('Trạng thái khắc phục (CAP)', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    head: [['Trạng thái', 'Số lượng', 'Tỷ lệ']],
    body: Object.entries(stats.byCapStatus).map(([k, v]) => [
      k, v, stats.total > 0 ? `${Math.round(v / stats.total * 100)}%` : '0%'
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    tableWidth: 80,
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 8

  // Section: By Department
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('Vi phạm theo bộ phận / khu vực', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    head: [['Bộ phận', 'Tổng vi phạm', 'Đã đóng', 'Tỷ lệ đóng']],
    body: Object.entries(stats.byDept).sort((a, b) => b[1].total - a[1].total).map(([dept, data]) => [
      dept,
      data.total,
      data.closed,
      data.total > 0 ? `${Math.round(data.closed / data.total * 100)}%` : '0%',
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    theme: 'grid',
  })

  // ── PAGE 2: VIOLATIONS TABLE ─────────────────────────────────────────────────
  doc.addPage()

  // Header bar page 2
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setFillColor(...RED)
  doc.rect(0, 22, 210, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('DANH SÁCH CÁC ĐIỂM CHƯA TUÂN THỦ', 105, 10, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Tổng cộng ${violations.length} vi phạm · ${now}`, 105, 17, { align: 'center' })

  autoTable(doc, {
    startY: 28,
    head: [[
      { content: 'STT', styles: { halign: 'center', cellWidth: 10 } },
      { content: 'Bộ phận', styles: { cellWidth: 22 } },
      { content: 'Chi tiết vi phạm', styles: { cellWidth: 60 } },
      { content: 'Mức độ', styles: { halign: 'center', cellWidth: 22 } },
      { content: 'Hình ảnh', styles: { cellWidth: 30 } },
      { content: 'Người phụ trách', styles: { cellWidth: 28 } },
      { content: 'Hạn XL', styles: { halign: 'center', cellWidth: 22 } },
    ]],
    body: violations.map((v, idx) => [
      { content: idx + 1, styles: { halign: 'center' } },
      v.department || '—',
      v.violation_detail || '—',
      { content: v.severity || '—', styles: { halign: 'center' } },
      v.evidence_url
        ? 'Xem ảnh (Supabase)'
        : v.image_path
          ? `Drive: ${v.image_path.split('/').pop() || '—'}`
          : '—',
      v.responsible_dept || v.inspector || '—',
      { content: fmtDate(v.due_date), styles: { halign: 'center' } },
    ]),
    styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 6, right: 6 },
    theme: 'grid',
    didParseCell(data) {
      // Color severity cells
      if (data.section === 'body' && data.column.index === 3) {
        const val = data.cell.raw?.content || data.cell.raw
        if (val === 'Critical') { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fillColor = [254, 226, 226] }
        else if (val === 'High') { data.cell.styles.textColor = [234, 88, 12]; data.cell.styles.fillColor = [255, 237, 213] }
        else if (val === 'Medium') { data.cell.styles.textColor = [202, 138, 4]; data.cell.styles.fillColor = [254, 249, 195] }
        else if (val === 'Low') { data.cell.styles.textColor = [22, 163, 74]; data.cell.styles.fillColor = [220, 252, 231] }
      }
    },
  })

  // Footer pages
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Trang ${i} / ${totalPages} · HSE Monitor RG1`, 105, 292, { align: 'center' })
  }

  const filename = `HSE_Report_RG1_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
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
    'Hình ảnh vi phạm',
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
    imageCell(v),
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
    { wch: 40 },
    { wch: 14 }, { wch: 16 },
    { wch: 14 },
  ]
  // Bold header row
  XLSX.utils.book_append_sheet(wb, wsVio, 'Vi phạm')

  const filename = `HSE_Report_RG1_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, filename)
}
