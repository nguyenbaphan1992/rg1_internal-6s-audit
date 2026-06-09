import { useState, useEffect, useRef } from 'react'
import { fetchViolations, updateCapStatus, uploadEvidenceImage } from '../lib/api'
import {
  RG1_DEPARTMENTS, INSPECTION_CATEGORIES, SEVERITY_LEVELS, CAP_STATUSES,
  getSeverityConfig, getCapStatusConfig
} from '../lib/constants'

// ─── SEVERITY BADGE ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  const cfg = getSeverityConfig(severity)
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {severity}
    </span>
  )
}

// ─── CAP STATUS BADGE ─────────────────────────────────────────────────────────
function CapBadge({ status }) {
  const cfg = getCapStatusConfig(status)
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function ViolationModal({ violation, onClose, onUpdated }) {
  const [status, setStatus] = useState(violation.cap_status || 'Chưa xử lý')
  const [note, setNote] = useState('')
  const [updatedBy, setUpdatedBy] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [evidenceUrl, setEvidenceUrl] = useState(violation.evidence_url || '')
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('')
  const [history, setHistory] = useState(violation.cap_updates || [])
  const fileRef = useRef()

  const fmt = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—'
  const severityCfg = getSeverityConfig(violation.severity)

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadEvidenceImage(file, violation.id)
      setNewEvidenceUrl(url)
      setEvidenceUrl(url)
    } catch (err) {
      alert('Lỗi upload ảnh: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateCapStatus(violation.id, status, note, updatedBy, newEvidenceUrl || undefined)
      onUpdated()
      onClose()
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge severity={violation.severity} />
              <span className="text-xs text-slate-400 font-mono">{violation.audit_id}</span>
            </div>
            <h2 className="text-base font-bold text-slate-800 leading-snug">{violation.violation_detail}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl ml-3 leading-none">×</button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['📍 Bộ phận', violation.department],
              ['🗂️ Hạng mục', violation.inspection_category],
              ['👤 Người kiểm tra', violation.inspector],
              ['📅 Ngày kiểm tra', fmt(violation.inspection_date)],
              ['🏢 Phòng chịu TN', violation.responsible_dept],
              ['⏰ Thời hạn XL', fmt(violation.due_date)],
            ].map(([label, val]) => (
              <div key={label} className="bg-slate-50 rounded-lg p-2.5">
                <div className="text-slate-400 mb-0.5">{label}</div>
                <div className="font-semibold text-slate-700">{val || '—'}</div>
              </div>
            ))}
          </div>

          {/* Violation image (from Sheet) */}
          {violation.image_path && (
            <div>
              <div className="text-xs text-slate-500 font-semibold mb-1">📸 Ảnh gốc vi phạm</div>
              <div className="bg-slate-100 rounded-lg p-3 text-xs text-slate-500 break-all">
                {violation.image_path}
                <div className="mt-1 text-slate-400 italic">
                  (Ảnh lưu trên Google Drive — tải ảnh khắc phục bên dưới)
                </div>
              </div>
            </div>
          )}

          {/* Evidence image uploaded */}
          {evidenceUrl && (
            <div>
              <div className="text-xs text-slate-500 font-semibold mb-1">🖼️ Ảnh bằng chứng khắc phục</div>
              <img
                src={evidenceUrl}
                alt="Bằng chứng"
                className="w-full max-h-48 object-contain rounded-lg border border-slate-200"
                onError={(e) => { e.target.style.display='none' }}
              />
            </div>
          )}

          {/* ─── CAP UPDATE FORM ─────────────────────────── */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
            <div className="font-bold text-blue-900 text-sm">✏️ Cập nhật trạng thái khắc phục (CAP)</div>

            <div>
              <label className="text-xs text-slate-600 font-medium">Trạng thái mới</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {CAP_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 font-medium">Ghi chú / mô tả biện pháp</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Mô tả hành động đã thực hiện..."
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 font-medium">Người cập nhật</label>
              <input
                value={updatedBy}
                onChange={e => setUpdatedBy(e.target.value)}
                placeholder="Tên người cập nhật"
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 font-medium">Upload ảnh bằng chứng khắc phục</label>
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={uploading}
                >
                  {uploading ? '⏳ Đang tải...' : '📎 Chọn ảnh'}
                </button>
                {newEvidenceUrl && <span className="text-green-600 text-xs">✅ Đã upload</span>}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>

          {/* CAP History */}
          {history.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">📜 Lịch sử cập nhật</div>
              <div className="space-y-2">
                {[...history].reverse().map(h => (
                  <div key={h.id} className="bg-slate-50 rounded-lg p-2.5 text-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-slate-400">{new Date(h.created_at).toLocaleString('vi-VN')}</span>
                      {h.updated_by && <span className="font-medium text-slate-600">· {h.updated_by}</span>}
                    </div>
                    <div>
                      <span className="text-slate-500">{h.old_status}</span>
                      <span className="mx-1.5">→</span>
                      <span className="font-semibold text-blue-700">{h.new_status}</span>
                    </div>
                    {h.note && <div className="text-slate-500 mt-0.5 italic">"{h.note}"</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {saving ? '⏳ Đang lưu...' : '💾 Lưu cập nhật'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── FILTER BAR ───────────────────────────────────────────────────────────────
function FilterBar({ filters, onChange }) {
  const months = [
    { v: '', l: 'Tất cả tháng' },
    ...Array.from({ length: 12 }, (_, i) => ({ v: String(i + 1), l: `Tháng ${i + 1}` }))
  ]
  const years = ['2024', '2025', '2026']

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Tìm vi phạm..."
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 flex-1 min-w-40"
        />

        {/* Department */}
        <select
          value={filters.department}
          onChange={e => onChange({ ...filters, department: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="all">Tất cả bộ phận</option>
          {RG1_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Severity */}
        <select
          value={filters.severity}
          onChange={e => onChange({ ...filters, severity: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="all">Tất cả mức độ</option>
          {SEVERITY_LEVELS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* CAP Status */}
        <select
          value={filters.capStatus}
          onChange={e => onChange({ ...filters, capStatus: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="all">Tất cả trạng thái</option>
          {CAP_STATUSES.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
        </select>

        {/* Month */}
        <select
          value={filters.month}
          onChange={e => onChange({ ...filters, month: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>

        {/* Year */}
        <select
          value={filters.year}
          onChange={e => onChange({ ...filters, year: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ViolationList() {
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const now = new Date()

  const [filters, setFilters] = useState({
    search: '',
    department: 'all',
    severity: 'all',
    capStatus: 'all',
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  })

  useEffect(() => {
    load()
  }, [filters.department, filters.severity, filters.capStatus, filters.month, filters.year])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchViolations({
        department: filters.department,
        severity: filters.severity,
        capStatus: filters.capStatus,
        month: filters.month ? parseInt(filters.month) : null,
        year: filters.year ? parseInt(filters.year) : now.getFullYear(),
      })
      setViolations(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

  // Client-side search filter
  const filtered = violations.filter(v => {
    if (!filters.search) return true
    const q = filters.search.toLowerCase()
    return (
      (v.violation_detail || '').toLowerCase().includes(q) ||
      (v.department || '').toLowerCase().includes(q) ||
      (v.inspection_category || '').toLowerCase().includes(q) ||
      (v.audit_id || '').toLowerCase().includes(q)
    )
  })

  // Summary counts
  const open   = filtered.filter(v => v.cap_status === 'Chưa xử lý').length
  const closed = filtered.filter(v => v.cap_status === 'Đã đóng').length
  const critical = filtered.filter(v => v.severity === 'Critical').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-blue-900">📋 Danh sách vi phạm — RG1</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} vi phạm · {open} chưa xử lý · {critical} critical · {closed} đã đóng
          </p>
        </div>
        <button
          onClick={load}
          className="text-sm bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors"
        >
          🔄 Làm mới
        </button>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-2">⚙️</div>
            <div className="text-slate-400 text-sm">Đang tải...</div>
          </div>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-500 font-semibold">Bộ phận</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-semibold">Hạng mục</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-semibold min-w-52">Chi tiết vi phạm</th>
                    <th className="text-center px-3 py-3 text-slate-500 font-semibold">Mức độ</th>
                    <th className="text-center px-3 py-3 text-slate-500 font-semibold">Ngày KT</th>
                    <th className="text-center px-3 py-3 text-slate-500 font-semibold">Hạn XL</th>
                    <th className="text-center px-3 py-3 text-slate-500 font-semibold">Trạng thái</th>
                    <th className="text-center px-3 py-3 text-slate-500 font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(v => {
                    const isOverdue = v.due_date && v.cap_status !== 'Đã đóng' && new Date(v.due_date) < new Date()
                    return (
                      <tr key={v.id}
                        className={`hover:bg-slate-50 cursor-pointer ${isOverdue ? 'bg-red-50/30' : ''}`}
                        onClick={() => setSelected(v)}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-700">{v.department || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {(v.inspection_category || '—').replace('An toàn ', '')}
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-xs">
                          <div className="line-clamp-2">{v.violation_detail}</div>
                        </td>
                        <td className="text-center px-3 py-3">
                          <SeverityBadge severity={v.severity} />
                        </td>
                        <td className="text-center px-3 py-3 text-slate-500">{fmt(v.inspection_date)}</td>
                        <td className={`text-center px-3 py-3 ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                          {fmt(v.due_date)}
                          {isOverdue && <div className="text-red-500 font-bold">⚠️ QH</div>}
                        </td>
                        <td className="text-center px-3 py-3">
                          <CapBadge status={v.cap_status} />
                        </td>
                        <td className="text-center px-3 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); setSelected(v) }}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Xem →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        <div className="text-3xl mb-2">🔍</div>
                        <div>Không tìm thấy vi phạm nào</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden space-y-2">
            {filtered.map(v => {
              const isOverdue = v.due_date && v.cap_status !== 'Đã đóng' && new Date(v.due_date) < new Date()
              return (
                <div
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer active:bg-slate-50 ${
                    isOverdue ? 'border-red-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={v.severity} />
                      <span className="text-xs text-slate-500 font-semibold">{v.department}</span>
                    </div>
                    <CapBadge status={v.cap_status} />
                  </div>
                  <div className="text-sm font-medium text-slate-700 mb-1 line-clamp-2">{v.violation_detail}</div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{v.inspection_category?.replace('An toàn ', '') || '—'}</span>
                    <span className={isOverdue ? 'text-red-500 font-semibold' : ''}>
                      {isOverdue ? '⚠️ ' : ''}Hạn: {fmt(v.due_date)}
                    </span>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <div className="text-3xl mb-2">🔍</div>
                <div>Không tìm thấy vi phạm nào</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* VIOLATION DETAIL MODAL */}
      {selected && (
        <ViolationModal
          violation={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}
