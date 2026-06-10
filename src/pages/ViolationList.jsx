import { useState, useEffect, useRef } from 'react'
import { fetchViolations, updateCapStatus, updateViolation, deleteViolation, uploadEvidenceImage, resolveGDriveImageUrl } from '../lib/api'
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

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditViolationModal({ violation, onClose, onUpdated }) {
  const [form, setForm] = useState({
    inspection_date: violation.inspection_date ? violation.inspection_date.slice(0, 10) : '',
    inspector: violation.inspector || '',
    department: violation.department || '',
    inspection_category: violation.inspection_category || '',
    violation_detail: violation.violation_detail || '',
    severity: violation.severity || 'Medium',
    responsible_dept: violation.responsible_dept || '',
    due_date: violation.due_date ? violation.due_date.slice(0, 10) : '',
    recorder: violation.recorder || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const severityCfg = getSeverityConfig(form.severity)

  async function handleSave() {
    if (!form.violation_detail.trim()) {
      alert('Vui lòng nhập chi tiết vi phạm')
      return
    }
    setSaving(true)
    try {
      await updateViolation(violation.id, {
        ...form,
        inspection_date: form.inspection_date || null,
        due_date: form.due_date || null,
      })
      onUpdated()
      onClose()
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-12 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">✏️ Chỉnh sửa vi phạm</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{violation.audit_id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none ml-3">×</button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Row 1: Ngày + Inspector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>📅 Ngày kiểm tra</label>
              <input type="date" value={form.inspection_date}
                onChange={e => set('inspection_date', e.target.value)}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>👤 Người kiểm tra</label>
              <input type="text" value={form.inspector}
                onChange={e => set('inspector', e.target.value)}
                placeholder="Tên người kiểm tra"
                className={inputCls} />
            </div>
          </div>

          {/* Row 2: Bộ phận + Hạng mục */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>🏭 Bộ phận / khu vực</label>
              <select value={form.department} onChange={e => set('department', e.target.value)} className={inputCls}>
                <option value="">-- Chọn bộ phận --</option>
                {RG1_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>🗂️ Hạng mục kiểm tra</label>
              <select value={form.inspection_category} onChange={e => set('inspection_category', e.target.value)} className={inputCls}>
                <option value="">-- Chọn hạng mục --</option>
                {INSPECTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Chi tiết vi phạm */}
          <div>
            <label className={labelCls}>⚠️ Chi tiết vi phạm <span className="text-red-500">*</span></label>
            <textarea value={form.violation_detail}
              onChange={e => set('violation_detail', e.target.value)}
              rows={3}
              placeholder="Mô tả chi tiết điểm vi phạm / chưa tuân thủ..."
              className={`${inputCls} resize-none`} />
          </div>

          {/* Severity + preview */}
          <div>
            <label className={labelCls}>🚦 Mức độ nghiêm trọng</label>
            <div className="flex items-center gap-3">
              <select value={form.severity} onChange={e => set('severity', e.target.value)} className={`${inputCls} flex-1`}>
                {SEVERITY_LEVELS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap"
                style={{ background: severityCfg.bg, color: severityCfg.color, border: `1px solid ${severityCfg.border}` }}>
                {form.severity}
              </span>
            </div>
          </div>

          {/* Row: Phòng chịu TN + Thời hạn */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>🏢 Phòng chịu trách nhiệm</label>
              <input type="text" value={form.responsible_dept}
                onChange={e => set('responsible_dept', e.target.value)}
                placeholder="VD: 1U01, Kỹ thuật..."
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>⏰ Thời hạn xử lý</label>
              <input type="date" value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
                className={inputCls} />
            </div>
          </div>

          {/* Recorder */}
          <div>
            <label className={labelCls}>📝 Người ghi nhận / duyệt</label>
            <input type="text" value={form.recorder}
              onChange={e => set('recorder', e.target.value)}
              placeholder="Tên người ghi nhận"
              className={inputCls} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            Hủy
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50">
            {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────────────────────
function DeleteConfirmModal({ violation, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteViolation(violation.id)
      onDeleted()
      onClose()
    } catch (err) {
      alert('Lỗi xóa: ' + err.message)
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6 text-center">
          <div className="text-5xl mb-4">🗑️</div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Xóa vi phạm?</h2>
          <p className="text-sm text-slate-500 mb-1">
            <span className="font-mono text-slate-400">{violation.audit_id}</span>
          </p>
          <p className="text-sm text-slate-600 line-clamp-2 mb-1">{violation.violation_detail}</p>
          <p className="text-xs text-red-500 mt-3 bg-red-50 rounded-lg p-2">
            ⚠️ Hành động này không thể hoàn tác. Toàn bộ lịch sử CAP cũng sẽ bị xóa.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            Hủy
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
            {deleting ? '⏳ Đang xóa...' : '🗑️ Xác nhận xóa'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function ViolationModal({ violation, onClose, onUpdated }) {
  const [status, setStatus] = useState(violation.cap_status || 'Chưa xử lý')
  const [note, setNote] = useState('')
  const [updatedBy, setUpdatedBy] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [evidenceUrl, setEvidenceUrl] = useState(violation.evidence_url || '')
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [showManualUrl, setShowManualUrl] = useState(false)
  const [history, setHistory] = useState(violation.cap_updates || [])
  const [resolvedImageUrl, setResolvedImageUrl] = useState(null)
  const [resolvingImage, setResolvingImage] = useState(false)
  const fileRef = useRef()

  // Resolve Google Drive image path → public URL
  useEffect(() => {
    if (!violation.image_path || violation.image_path.startsWith('http')) {
      setResolvedImageUrl(violation.image_path || null)
      return
    }
    setResolvingImage(true)
    resolveGDriveImageUrl(violation.image_path).then(url => {
      setResolvedImageUrl(url)
      setResolvingImage(false)
    })
  }, [violation.image_path])

  const fmt = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—'

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const url = await uploadEvidenceImage(file, violation.id)
      setNewEvidenceUrl(url)
      setEvidenceUrl(url)
    } catch (err) {
      setUploadError('Lỗi upload: ' + err.message + ' — Thử dùng "Nhập URL" bên dưới')
    } finally {
      setUploading(false)
    }
  }

  function handleManualUrl() {
    if (!manualUrl.trim()) return
    setNewEvidenceUrl(manualUrl.trim())
    setEvidenceUrl(manualUrl.trim())
    setShowManualUrl(false)
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

          {/* ─── ẢNH VI PHẠM GỐC (từ Google Sheet / Drive) ─── */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">📸 Ảnh vi phạm gốc</span>
              {resolvingImage && (
                <span className="text-xs text-slate-400 animate-pulse">⏳ Đang tải ảnh...</span>
              )}
            </div>
            {violation.image_path ? (
              <div className="p-3">
                {resolvingImage ? (
                  <div className="flex items-center justify-center h-32 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 text-sm animate-pulse">Đang resolve ảnh Drive...</span>
                  </div>
                ) : resolvedImageUrl ? (
                  <img
                    src={resolvedImageUrl}
                    alt="Ảnh vi phạm"
                    className="w-full max-h-64 object-contain rounded-lg border border-slate-100 bg-slate-50"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'block'
                    }}
                  />
                ) : null}
                {/* Fallback nếu không resolve được */}
                <div className={`text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5 mt-2 ${resolvingImage || resolvedImageUrl ? 'hidden' : ''}`}>
                  <div className="font-medium mb-1">⚠️ Không tìm thấy ảnh trên Drive</div>
                  <div className="break-all font-mono text-amber-600">{violation.image_path.split('/').pop()}</div>
                  <div className="mt-1 text-slate-400">Kiểm tra thư mục đã được share "Anyone with the link" chưa.</div>
                </div>
              </div>
            ) : (
              <div className="p-3 text-xs text-slate-400 italic">Không có ảnh gốc</div>
            )}
          </div>

          {/* ─── ẢNH BẰNG CHỨNG KHẮC PHỤC ─── */}
          {evidenceUrl && (
            <div className="border border-green-200 rounded-xl overflow-hidden">
              <div className="bg-green-50 px-3 py-2 border-b border-green-100">
                <span className="text-xs font-semibold text-green-700">✅ Ảnh bằng chứng khắc phục</span>
              </div>
              <div className="p-3">
                <img
                  src={evidenceUrl}
                  alt="Bằng chứng khắc phục"
                  className="w-full max-h-56 object-contain rounded-lg border border-slate-200 bg-slate-50"
                  onError={(e) => {
                    e.target.style.display='none'
                    e.target.parentElement.innerHTML += `<div class="text-xs text-red-500 p-2">⚠️ Không tải được ảnh.</div>`
                  }}
                />
              </div>
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
              <label className="text-xs text-slate-600 font-medium">📎 Ảnh bằng chứng khắc phục</label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={uploading}
                >
                  {uploading ? '⏳ Đang tải...' : '📂 Upload từ máy'}
                </button>
                <button
                  onClick={() => setShowManualUrl(v => !v)}
                  className="bg-white border border-slate-200 text-blue-600 text-xs px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  🔗 Nhập URL ảnh
                </button>
                {newEvidenceUrl && <span className="text-green-600 text-xs font-semibold">✅ Đã có ảnh</span>}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
              {uploadError && (
                <div className="mt-1.5 text-xs text-red-600 bg-red-50 rounded p-2">{uploadError}</div>
              )}
              {showManualUrl && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={manualUrl}
                    onChange={e => setManualUrl(e.target.value)}
                    placeholder="Dán URL ảnh (Google Drive, imgur, ...)"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <button
                    onClick={handleManualUrl}
                    className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700"
                  >Dùng URL</button>
                </div>
              )}
              <div className="mt-1.5 text-xs text-slate-400">
                💡 Google Drive: tải ảnh → Share → Anyone with link → Copy link
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
        <input
          type="text"
          placeholder="🔍 Tìm vi phạm..."
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 flex-1 min-w-40"
        />
        <select value={filters.department} onChange={e => onChange({ ...filters, department: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="all">Tất cả bộ phận</option>
          {RG1_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filters.severity} onChange={e => onChange({ ...filters, severity: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="all">Tất cả mức độ</option>
          {SEVERITY_LEVELS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filters.capStatus} onChange={e => onChange({ ...filters, capStatus: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="all">Tất cả trạng thái</option>
          {CAP_STATUSES.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
        </select>
        <select value={filters.month} onChange={e => onChange({ ...filters, month: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <select value={filters.year} onChange={e => onChange({ ...filters, year: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ViolationList({ role = 'guest' }) {
  const canEdit = role === 'admin'
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)      // view modal
  const [editing, setEditing] = useState(null)        // edit modal
  const [deleting, setDeleting] = useState(null)      // delete modal
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

  const open     = filtered.filter(v => v.cap_status === 'Chưa xử lý').length
  const closed   = filtered.filter(v => v.cap_status === 'Đã đóng').length
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
        <button onClick={load}
          className="text-sm bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors">
          🔄 Làm mới
        </button>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">⚠️ {error}</div>
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
                        className={`hover:bg-slate-50 ${isOverdue ? 'bg-red-50/30' : ''}`}>
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
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelected(v)}
                              title="Xem chi tiết"
                              className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                            >👁</button>
                            {canEdit && (
                              <button
                                onClick={() => setEditing(v)}
                                title="Chỉnh sửa"
                                className="px-2 py-1 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors font-medium"
                              >✏️</button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => setDeleting(v)}
                                title="Xóa"
                                className="px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium"
                              >🗑️</button>
                            )}
                          </div>
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
                <div key={v.id}
                  className={`bg-white rounded-xl shadow-sm border p-4 ${isOverdue ? 'border-red-200' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={v.severity} />
                      <span className="text-xs text-slate-500 font-semibold">{v.department}</span>
                    </div>
                    <CapBadge status={v.cap_status} />
                  </div>
                  <div className="text-sm font-medium text-slate-700 mb-1 line-clamp-2">{v.violation_detail}</div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span>{v.inspection_category?.replace('An toàn ', '') || '—'}</span>
                    <span className={isOverdue ? 'text-red-500 font-semibold' : ''}>
                      {isOverdue ? '⚠️ ' : ''}Hạn: {fmt(v.due_date)}
                    </span>
                  </div>
                  {/* Mobile action buttons */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setSelected(v)}
                      className="flex-1 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                    >👁 Xem</button>
                    {canEdit && (
                      <button
                        onClick={() => setEditing(v)}
                        className="flex-1 py-1.5 text-xs text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors font-medium"
                      >✏️ Sửa</button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => setDeleting(v)}
                        className="flex-1 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium"
                      >🗑️ Xóa</button>
                    )}
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

      {/* VIEW MODAL */}
      {selected && (
        <ViolationModal
          violation={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); load() }}
        />
      )}

      {/* EDIT MODAL */}
      {editing && (
        <EditViolationModal
          violation={editing}
          onClose={() => setEditing(null)}
          onUpdated={() => { setEditing(null); load() }}
        />
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleting && (
        <DeleteConfirmModal
          violation={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => { setDeleting(null); load() }}
        />
      )}
    </div>
  )
}
