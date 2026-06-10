import { useState } from 'react'
import { loginAsGuest, loginAsAdmin } from '../lib/auth'

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleAdmin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTimeout(() => {
      const ok = loginAsAdmin(username.trim(), password)
      if (ok) {
        onLogin('admin')
      } else {
        setError('Sai tên đăng nhập hoặc mật khẩu.')
      }
      setLoading(false)
    }, 300)
  }

  function handleGuest() {
    loginAsGuest()
    onLogin('guest')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-900 px-6 py-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img
              src="/logo_rg.png"
              alt="Logo RG"
              className="h-12 w-auto object-contain drop-shadow"
              onError={e => { e.target.style.display='none' }}
            />
          </div>
          <h1 className="text-white font-bold text-xl leading-tight">HSE Monitor</h1>
          <p className="text-blue-300 text-sm mt-1">Nhà máy RG1 · Công ty TNHH May Tinh Lợi</p>
          <div className="mt-3">
            <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
              Internal Safety Audit
            </span>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Admin login form */}
          <form onSubmit={handleAdmin} className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              🔐 Đăng nhập Admin
            </div>
            <input
              type="text"
              placeholder="Tên đăng nhập"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoComplete="current-password"
            />
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                ⚠️ {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {loading ? '⏳ Đang xác thực...' : '🔑 Đăng nhập'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs text-slate-400">hoặc</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Guest mode */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              👁 Chế độ khách (Chỉ xem)
            </div>
            <button
              onClick={handleGuest}
              className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors border border-slate-200"
            >
              Vào xem
            </button>
            <p className="text-xs text-slate-400 text-center">
              Chỉ xem dữ liệu, không thể thêm / sửa / xóa
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        HSE Monitor · RG1 · {new Date().getFullYear()}
      </p>
    </div>
  )
}
