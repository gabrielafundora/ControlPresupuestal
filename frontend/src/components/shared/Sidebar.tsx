import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { useAuthStore } from '../../store/authStore'
import { canUser } from '../../lib/permissions'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/projects', label: 'Proyectos', icon: '🏗️' },
  { to: '/providers', label: 'Proveedores', icon: '🏢' },
]

const adminNav = [
  { to: '/users', label: 'Usuarios', icon: '👥' },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-gray-700">
        <h1 className="font-bold text-lg leading-tight">Control<br />Presupuestal</h1>
        <p className="text-xs text-gray-400 mt-1">Gestión de proyectos</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white')
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        {canUser(user?.role, 'manage:users') && adminNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white')
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="mb-3">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>
        <button onClick={logout} className="w-full text-left text-xs text-gray-400 hover:text-white transition-colors">
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
