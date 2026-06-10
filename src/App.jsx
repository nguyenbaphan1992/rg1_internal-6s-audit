import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ViolationList from './pages/ViolationList'
import AddViolation from './pages/AddViolation'
import ImportSheet from './pages/ImportSheet'
import LoginScreen from './pages/LoginScreen'
import { getRole } from './lib/auth'
import { initTheme, toggleTheme, getTheme } from './lib/theme'

function App() {
  const [page, setPage] = useState('dashboard')
  const [role, setRole] = useState(() => getRole())
  const [theme, setTheme] = useState(() => getTheme())

  // Áp dụng theme khi app mount
  useEffect(() => {
    initTheme()
  }, [])

  function handleToggleTheme() {
    const next = toggleTheme()
    setTheme(next)
  }

  function handleLogin(newRole) {
    setRole(newRole)
  }

  function handleLogout() {
    localStorage.removeItem('hse_role')
    setRole(null)
  }

  // Chưa đăng nhập → màn hình login
  if (!role) {
    return <LoginScreen onLogin={handleLogin} />
  }

  function renderPage() {
    // Guest không được vào add/import
    if (role === 'guest' && (page === 'add' || page === 'import')) {
      return <Dashboard onNavigate={setPage} role={role} />
    }
    switch (page) {
      case 'dashboard':  return <Dashboard onNavigate={setPage} role={role} />
      case 'violations': return <ViolationList role={role} />
      case 'add':        return <AddViolation onNavigate={setPage} role={role} />
      case 'import':     return <ImportSheet onNavigate={setPage} role={role} />
      default:           return <Dashboard onNavigate={setPage} role={role} />
    }
  }

  return (
    <Layout
      currentPage={page}
      onNavigate={setPage}
      role={role}
      onLogout={handleLogout}
      theme={theme}
      onToggleTheme={handleToggleTheme}
    >
      {renderPage()}
    </Layout>
  )
}

export default App
