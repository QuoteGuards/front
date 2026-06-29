import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import GlobalNav from './GlobalNav'
import Sidebar from '../common/Sidebar'
import './AppLayout.css'

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="app-layout">
      <GlobalNav collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="app-layout__body">
        <Sidebar collapsed={collapsed} />
        <main className="app-layout__main" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
