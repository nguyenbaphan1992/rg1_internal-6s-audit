import { useState } from 'react'

// Nav items theo role (English menu)
function getNavItems(role) {
  const all = [
    { id: 'dashboard',  label: 'Dashboard',  icon: '📊' },
    { id: 'violations', label: 'Issues',      icon: '📋' },
    { id: 'add',        label: 'Add Issue',   icon: '➕', adminOnly: true },
    { id: 'import',     label: 'Import',      icon: '📥', adminOnly: true },
  ]
  return role === 'admin' ? all : all.filter(i => !i.adminOnly)
}

export default function Layout({ currentPage, onNavigate, children, role, onLogout, theme, onToggleTheme }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = getNavItems(role)
  const isDark = theme === 'dark'

  const roleLabel = role === 'admin'
    ? { text: 'Admin', cls: 'bg-green-600 text-white' }
    : { text: 'Guest', cls: 'bg-amber-500 text-white' }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* TOP HEADER */}
      <header className="bg-blue-900 text-white shadow-lg sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Hamburger + Logo */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1 rounded hover:bg-blue-800"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              <span className="block w-5 h-0.5 bg-white mb-1"></span>
              <span className="block w-5 h-0.5 bg-white mb-1"></span>
              <span className="block w-5 h-0.5 bg-white"></span>
            </button>
            <div className="flex items-center gap-2">
              {/* Logo image — fallback sang emoji nếu file chưa có */}
              <img
                src="/logo_rg.png"
                alt="RG Logo"
                className="h-8 w-auto object-contain"
                onError={e => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div
                className="w-8 h-8 bg-red-600 rounded items-center justify-center text-white font-bold text-sm shadow hidden"
              >
                🦺
              </div>
              <div>
                <div className="font-bold text-sm leading-tight">HSE Monitor</div>
                <div className="text-blue-200 text-xs leading-tight">RG1 · Tinh Lợi</div>
              </div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  currentPage === item.id
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`}
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right side: dark mode toggle + role badge + logout */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={onToggleTheme}
              title={isDark ? 'Chuyển sang Light Mode' : 'Chuyển sang Dark Mode'}
              className="text-blue-200 hover:text-white p-1.5 rounded hover:bg-blue-800 transition-colors text-base leading-none"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${roleLabel.cls}`}>
              {roleLabel.text}
            </span>
            <button
              onClick={onLogout}
              title="Đăng xuất"
              className="text-blue-200 hover:text-white text-xs px-2 py-1 rounded hover:bg-blue-800 transition-colors"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileOpen && (
          <div className="md:hidden bg-blue-800 border-t border-blue-700 px-4 pb-3">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setMobileOpen(false) }}
                className={`w-full text-left px-3 py-2.5 rounded mb-1 text-sm font-medium ${
                  currentPage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div className="flex gap-2 mt-2 pt-2 border-t border-blue-700">
              <button
                onClick={() => { onToggleTheme(); setMobileOpen(false) }}
                className="flex-1 text-left px-3 py-2 text-sm text-blue-200 hover:bg-blue-700 rounded"
              >
                {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </button>
              <button
                onClick={() => { onLogout(); setMobileOpen(false) }}
                className="flex-1 text-left px-3 py-2 text-sm text-red-300 hover:bg-blue-700 rounded"
              >
                🚪 Đăng xuất
              </button>
            </div>
          </div>
        )}
      </header>

      {/* RED ACCENT BAR */}
      <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-6 max-w-screen-2xl mx-auto w-full">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="bg-blue-900 text-blue-300 text-center text-xs py-2 px-4">
        HSE Monitor · Nhà máy RG1 · Công ty TNHH May Tinh Lợi · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
