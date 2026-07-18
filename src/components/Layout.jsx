import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileHeader from './MobileHeader'
import MobileNav from './MobileNav'

export default function Layout() {
  return (
    <div className="flex min-h-svh flex-col bg-gray-50 md:flex-row">
      <Sidebar />
      <MobileHeader />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
