import { useState, useRef } from 'react'
import { createViolation, updateViolation, uploadEvidenceImage } from '../lib/api'
import {
  RG1_DEPARTMENTS, INSPECTION_CATEGORIES, SEVERITY_LEVELS, INSPECTORS
} from '../lib/constants'

export default function AddViolation({ onNavigate }) {
  const [form, setForm] = useState({
    inspection_date: new Date().toISOString().split('T')[0],
    inspector: INSPECTORS[0],
    department: '',
    inspection_category: '',
    violation_detail: '',
    responsible_dept: '',
    due_date: '',
    severity: 'Medium',
    recorder: 'Nguyễn Bá Phan',
    cap_status: 'Chưa xử lý',
    factory: 'RG1',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Image states
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef()

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageUrl('')
    setUploadError('')
  }

  function handleRemoveImage() {
    setImageFile(null)
    setImagePreview(null)
    setImageUrl('')
    setUploadError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.violation_detail || !form.department) {
      setError('Vui lòng điền bộ phận và chi tiết vi phạm')
      return
    }
    setSaving(true)
    setError(null)
    setUploadError('')
    try {
      // 1. Tạo vi phạm
      const payload = {
        ...form,
        inspection_date: form.inspection_date ? new Date(form.inspection_date).toISOString() : null,
        due_date: form.due_date || null,
      }
      const created = await createViolation(payload)

      // 2. Upload ảnh nếu có
      let evidenceUrl = imageUrl.trim() || null
      if (imageFile && created?.id) {
        try {
          evidenceUrl = await uploadEvidenceImage(imageFile, created.id)
        } catch (uploadErr) {
          setUploadError('Lưu vi phạm thành công, nhưng upload ảnh thất bại: ' + uploadErr.message)
        }
      }

      // 3. Cập nhật evidence_url nếu có ảnh
      if (evidenceUrl && created?.id) {
        await updateViolation(created.id, { evidence_url: evidenceUrl })
      }

      setSuccess(true)
      setTimeout(() => { setSuccess(false); onNavigate('violations') }, 1800)
    } catch (err) {
      setError('Lỗi lưu: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1"

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-blue-900">➕ Ghi nhận vi phạm mới</h1>
        <p className="text-sm text-slate-500 mt-0.5">Nhà máy RG1 · Internal Safety Audit</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl p-4 flex items-center gap-2">
          ✅ Đã lưu vi phạm thành công! Đang chuyển hướng...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
          ⚠️ {error}
        </div>
      )}

      {uploadError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl p-4">
          ⚠️ {uploadError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">

        {/* ROW 1: Ngày + Người kiểm tra */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>📅 Ngày kiểm tra *</label>
            <input type="date" className={inputCls} value={form.inspection_date}
              onChange={e => set('inspection_date', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>👤 Người kiểm tra</label>
            <select className={inputCls} value={form.inspector}
              onChange={e => set('inspector', e.target.value)}>
              {INSPECTORS.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>

        {/* ROW 2: Bộ phận + Hạng mục */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>📍 Bộ phận / Khu vực *</label>
            <select className={inputCls} value={form.department}
              onChange={e => set('department', e.target.value)} required>
              <option value="">-- Chọn bộ phận --</option>
              {RG1_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>🗂️ Hạng mục kiểm tra</label>
            <select className={inputCls} value={form.inspection_category}
              onChange={e => set('inspection_category', e.target.value)}>
              <option value="">-- Chọn hạng mục --</option>
              {INSPECTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Chi tiết vi phạm */}
        <div>
          <label className={labelCls}>⚠️ Chi tiết vi phạm / điểm chưa tuân thủ *</label>
          <textarea
            className={`${inputCls} resize-none`}
            value={form.violation_detail}
            onChange={e => set('violation_detail', e.target.value)}
            rows={3}
            placeholder="Mô tả chi tiết vi phạm..."
            required
          />
        </div>

        {/* ROW 3: Mức độ + Phòng chịu trách nhiệm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>🎯 Mức độ nghiêm trọng</label>
            <select className={inputCls} value={form.severity}
              onChange={e => set('severity', e.target.value)}>
              {SEVERITY_LEVELS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {form.severity && (
              <div className="mt-1.5">
                {(() => {
                  const cfg = SEVERITY_LEVELS.find(s => s.value === form.severity)
                  return cfg ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      {cfg.label}
                    </span>
                  ) : null
                })()}
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>🏢 Phòng ban chịu trách nhiệm</label>
            <select className={inputCls} value={form.responsible_dept}
              onChange={e => set('responsible_dept', e.target.value)}>
              <option value="">-- Chọn bộ phận --</option>
              {RG1_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* ROW 4: Thời hạn + Người ghi nhận */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>⏰ Thời hạn xử lý</label>
            <input type="date" className={inputCls} value={form.due_date}
              onChange={e => set('due_date', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>✅ Người ghi nhận / duyệt</label>
            <input type="text" className={inputCls} value={form.recorder}
              placeholder="Tên người ghi nhận"
              onChange={e => set('recorder', e.target.value)} />
          </div>
        </div>

        {/* ─── ẢNH BẰNG CHỨNG VI PHẠM ─── */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-600">📸 Ảnh bằng chứng vi phạm</span>
            <span className="ml-2 text-xs text-slate-400">(tuỳ chọn)</span>
          </div>
          <div className="p-4 space-y-3">
            {/* Preview */}
            {imagePreview && (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview"
                  className="max-h-48 max-w-full rounded-lg border border-slate-200 object-contain bg-slate-50" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 shadow"
                >×</button>
              </div>
            )}

            {/* URL preview */}
            {imageUrl && !imagePreview && (
              <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-lg p-2.5">
                <span className="text-green-600 font-medium">🔗 URL ảnh đã nhập</span>
                <span className="text-slate-400 truncate flex-1">{imageUrl}</span>
                <button type="button" onClick={() => setImageUrl('')}
                  className="text-red-400 hover:text-red-600 font-bold">×</button>
              </div>
            )}

            {/* Action buttons */}
            {!imagePreview && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-xs px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  📂 Chọn ảnh từ máy
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(v => !v)}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 text-blue-600 text-xs px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                >
                  🔗 Nhập URL ảnh
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={handleImageSelect} />
              </div>
            )}

            {imagePreview && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs text-blue-600 hover:underline"
                >Đổi ảnh khác</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={handleImageSelect} />
              </div>
            )}

            {/* URL input */}
            {showUrlInput && !imagePreview && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="Dán URL ảnh (Google Drive share link, imgur, ...)"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  type="button"
                  onClick={() => setShowUrlInput(false)}
                  className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700"
                >Dùng URL</button>
              </div>
            )}

            <div className="text-xs text-slate-400">
              💡 Hỗ trợ JPG, PNG, WEBP. Google Drive: Upload ảnh → Share → Anyone with link → Copy link
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 sm:flex-none bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {saving ? '⏳ Đang lưu...' : '💾 Lưu vi phạm'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('violations')}
            className="flex-1 sm:flex-none border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Huỷ
          </button>
        </div>
      </form>
    </div>
  )
}
