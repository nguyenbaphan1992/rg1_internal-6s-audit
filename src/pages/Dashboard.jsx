import { useState, useEffect, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { fetchDashboardStats, fetchRecentViolationsWithImages } from '../lib/api'
import { SEVERITY_LEVELS, CAP_STATUSES, CATEGORY_COLORS, getSeverityConfig, getCapStatusConfig } from '../lib/constants'

// ─── DEPT COMPARE CHART ───────────────────────────────────────────────────────
function DeptCompareChart({ byDept }) {
  const data = Object.entries(byDept)
    .map(([dept, { total, closed }]) => ({
      dept,
      'Tổng': total,
      'Đã đóng': closed,
      'Chưa đóng': total - closed,
    }))
    .sort((a, b) => b['Tổng'] - a['Tổng'])

  if (!data.length) return (
    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Chưa có dữ liệu</div>
  )

  const CustomTooltipDept = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-lg text-xs">
        <div className="font-bold text-slate-700 mb-1.5">{label}</div>
        {payload.map(p => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill }} />
            <span className="text-slate-500">{p.name}:</span>
            <span className="font-semibold" style={{ color: p.fill }}>{p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 50 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="dept" tick={{ fontSize: 10, fill: '#64748b' }} angle={-40} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip content={<CustomTooltipDept />} />
        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
        <Bar dataKey="Chưa đóng" stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
        <Bar dataKey="Đã đóng"   stackId="a" fill="#22c55e" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── KPI CARD ────────────────────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, color, icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-start gap-3 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">{title}</div>
        <div className="text-3xl font-bold mt-0.5" style={{ color }}>{value}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
      </div>
    </div>
  )
}

// ─── ROLLING IMAGE PANEL ──────────────────────────────────────────────────────
function RollingImagePanel({ images }) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!images.length) return
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % images.length)
    }, 4000)
    return () => clearInterval(timerRef.current)
  }, [images.length])

  if (!images.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-full min-h-48">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-red-600 font-bold text-sm">📸 Ảnh vi phạm mới nhất</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Chưa có ảnh bằng chứng nào được tải lên
        </div>
      </div>
    )
  }

  const img = images[current]
  const severityCfg = getSeverityConfig(img.severity)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
        <span className="text-blue-900 font-bold text-sm">📸 Vi phạm mới nhất</span>
        <span className="text-xs text-slate-400">{current + 1}/{images.length}</span>
      </div>

      <div className="flex-1 relative bg-slate-50 overflow-hidden" style={{ minHeight: '180px' }}>
        <img
          key={img.id}
          src={img.evidence_url}
          alt="Ảnh vi phạm"
          className="w-full h-full object-cover slide-in"
          onError={(e) => { e.target.style.display = 'none' }}
        />
        {/* Overlay info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: severityCfg.bg, color: severityCfg.color }}
          >
            {img.severity}
          </span>
        </div>
      </div>

      <div className="px-3 py-2.5 text-xs">
        <div className="font-semibold text-slate-700 line-clamp-2">{img.violation_detail}</div>
        <div className="flex items-center gap-2 mt-1 text-slate-400">
          <span>📍 {img.department}</span>
          <span>·</span>
          <span>{img.inspection_date ? new Date(img.inspection_date).toLocaleDateString('vi-VN') : ''}</span>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1 pb-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-blue-700 w-3' : 'bg-slate-300'}`}
          />
        ))}
      </div>
    </div>
  )
}

// ─── DEPT CAP TABLE ───────────────────────────────────────────────────────────
function DeptCapTable({ byDept }) {
  const rows = Object.entries(byDept)
    .map(([dept, { total, closed }]) => ({
      dept,
      total,
      closed,
      rate: total > 0 ? Math.round((closed / total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="font-bold text-blue-900 text-sm">Tỷ lệ đóng CAP theo bộ phận</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2 text-slate-500 font-semibold">Bộ phận</th>
              <th className="text-center px-3 py-2 text-slate-500 font-semibold">Tổng</th>
              <th className="text-center px-3 py-2 text-slate-500 font-semibold">Đã đóng</th>
              <th className="text-left px-4 py-2 text-slate-500 font-semibold w-32">Tỷ lệ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.dept} className="border-t border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-700">{row.dept}</td>
                <td className="text-center px-3 py-2 text-slate-600">{row.total}</td>
                <td className="text-center px-3 py-2 text-green-600 font-semibold">{row.closed}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${row.rate}%`,
                          background: row.rate >= 80 ? '#22c55e' : row.rate >= 50 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <span className="text-slate-600 font-semibold w-8 text-right">{row.rate}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-slate-400">Chưa có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── MONTH/YEAR FILTER ────────────────────────────────────────────────────────
function MonthFilter({ month, year, onChange }) {
  const months = ['Tất cả', 'T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']
  const years  = [2024, 2025, 2026]
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={month || 0}
        onChange={e => onChange({ month: parseInt(e.target.value) || null, year })}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
      </select>
      <select
        value={year}
        onChange={e => onChange({ month, year: parseInt(e.target.value) })}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

// ─── SEVERITY PIE CHART ───────────────────────────────────────────────────────
const SEVERITY_COLORS = { Critical: '#dc2626', High: '#f97316', Medium: '#eab308', Low: '#22c55e' }

function SeverityPie({ bySeverity }) {
  const data = SEVERITY_LEVELS
    .map(s => ({ name: s.label, value: bySeverity[s.value] || 0, color: s.color }))
    .filter(d => d.value > 0)

  if (!data.length) return (
    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Chưa có dữ liệu</div>
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(val, name) => [val, name]} />
        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── CATEGORY BAR CHART ───────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-lg text-xs">
      <div className="font-semibold text-slate-700 mb-1">{label}</div>
      <div className="text-blue-600 font-bold">{payload[0].value} vi phạm</div>
    </div>
  )
}

function CategoryBarChart({ byCategory }) {
  const data = Object.entries(byCategory)
    .map(([name, value]) => ({
      name: name.replace('An toàn ', '').replace('Biển cảnh báo, poster an toàn, bảng tin', 'Biển/Poster'),
      fullName: name,
      value
    }))
    .sort((a, b) => b.value - a.value)

  if (!data.length) return (
    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Chưa có dữ liệu</div>
  )

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: '#64748b' }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── CAP STATUS PILLS ─────────────────────────────────────────────────────────
function CapStatusBar({ byCapStatus, total }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {CAP_STATUSES.map(status => {
        const count = byCapStatus[status.value] || 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={status.value} className={`rounded-lg p-3 ${status.className}`}>
            <div className="text-xs font-medium opacity-80">{status.icon} {status.label}</div>
            <div className="text-2xl font-bold mt-1">{count}</div>
            <div className="text-xs opacity-70">{pct}% tổng số</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const now = new Date()
  const [filter, setFilter] = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const [stats, setStats] = useState(null)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [filter])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [s, imgs] = await Promise.all([
        fetchDashboardStats(filter),
        fetchRecentViolationsWithImages(8)
      ])
      setStats(s)
      setImages(imgs)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const monthLabel = filter.month ? `Tháng ${filter.month}/${filter.year}` : `Năm ${filter.year}`

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-blue-900">📊 Tổng quan HSE — RG1</h1>
          <p className="text-sm text-slate-500 mt-0.5">Internal Safety Audit · {monthLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthFilter month={filter.month} year={filter.year} onChange={setFilter} />
          <button
            onClick={load}
            className="text-sm bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors"
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-3">⚙️</div>
            <div className="text-slate-500 text-sm">Đang tải dữ liệu...</div>
          </div>
        </div>
      ) : stats ? (
        <>
          {/* KPI CARDS ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard
              title="Tổng vi phạm"
              value={stats.total}
              icon="📋"
              color="#1e40af"
              subtitle={monthLabel}
              onClick={() => onNavigate('violations')}
            />
            <KpiCard
              title="Critical"
              value={stats.bySeverity.Critical || 0}
              icon="🔴"
              color="#dc2626"
              subtitle="Rất nghiêm trọng"
              onClick={() => onNavigate('violations')}
            />
            <KpiCard
              title="High"
              value={stats.bySeverity.High || 0}
              icon="🟠"
              color="#ea580c"
              subtitle="Nghiêm trọng"
              onClick={() => onNavigate('violations')}
            />
            <KpiCard
              title="Medium"
              value={stats.bySeverity.Medium || 0}
              icon="🟡"
              color="#ca8a04"
              subtitle="Trung bình"
              onClick={() => onNavigate('violations')}
            />
            <KpiCard
              title="Tỷ lệ đóng CAP"
              value={`${stats.capRate}%`}
              icon="✅"
              color={stats.capRate >= 80 ? '#16a34a' : stats.capRate >= 50 ? '#ca8a04' : '#dc2626'}
              subtitle={`${stats.byCapStatus['Đã đóng'] || 0}/${stats.total} vi phạm`}
            />
          </div>

          {/* CAP STATUS BAR */}
          <CapStatusBar byCapStatus={stats.byCapStatus} total={stats.total} />

          {/* MAIN CHARTS + ROLLING IMAGE */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Left: Category Bar Chart */}
            <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-bold text-blue-900 text-sm mb-3">Vi phạm theo hạng mục kiểm tra</h3>
              <CategoryBarChart byCategory={stats.byCategory} />
            </div>

            {/* Right: Rolling Image */}
            <div className="xl:col-span-1">
              <RollingImagePanel images={images} />
            </div>
          </div>

          {/* LOWER ROW: Dept Compare + Severity Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Dept Compare Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-bold text-blue-900 text-sm mb-1">So sánh vi phạm theo bộ phận</h3>
              <p className="text-xs text-slate-400 mb-2">Xanh = đã đóng · Đỏ = chưa đóng</p>
              <DeptCompareChart byDept={stats.byDept} />
            </div>

            {/* Severity Pie */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-bold text-blue-900 text-sm mb-2">Phân bố theo mức độ nghiêm trọng</h3>
              <SeverityPie bySeverity={stats.bySeverity} />
            </div>
          </div>

          {/* Dept CAP Rate Table */}
          <DeptCapTable byDept={stats.byDept} />
        </>
      ) : null}
    </div>
  )
}
