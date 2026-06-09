import { useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ViolationList from './pages/ViolationList'
import AddViolation from './pages/AddViolation'
import ImportSheet from './pages/ImportSheet'

function App() {
  const [page, setPage] = useState('dashboard')

  function renderPage() {
    switch (page) {
      case 'dashboard':  return <Dashboard onNavigate={setPage} />
      case 'violations': return <ViolationList />
      case 'add':        return <AddViolation onNavigate={setPage} />
      case 'import':     return <ImportSheet onNavigate={setPage} />
      default:           return <Dashboard onNavigate={setPage} />
    }
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  )
}

export default App
