import { useState } from 'react'
import { createViolation } from '../lib/api'
import {
  RG1_DEPARTMENTS, INSPECTION_CATEGORIES, SEVERITY_LEVELS
} from '../lib/constants'

export default function AddViolation({ onNavigate }) {
  const [form, setForm] = useState({
    inspection_date: new Date().toISOString().split('T')[0],
    inspector: '',
    department: '',
    inspection_category: '',
    violation_detail: '',
    responsible_dept: '',
    due_date: '',
    severity: 'Medium',
    recorder: '',
    cap_status: 'Chưa xử lý',
    factory: 'RG1',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.violation_detail || !form.department) {
      setError('Vui lòng điền bộ phận và chi tiết vi phạm')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        inspection_date: form.inspection_date ? new Date(form.inspection_date).toISOString() : null,
        due_date: form.due_date || null,
      }
      await createViolation(payload)
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onNavigate('violations') }, 1500)
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
            <input type="text" className={inputCls} value={form.inspector}
              placeholder="Tên người kiểm tra"
              onChange={e => set('inspector', e.target.value)} />
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
            className={inputCls}
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
            {/* Severity visual hint */}
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
