import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { LoginPage } from '../pages/auth/LoginPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { ProjectsListPage } from '../pages/projects/ProjectsListPage'
import { ProjectDetailPage } from '../pages/projects/ProjectDetailPage'
import { ProvidersPage } from '../pages/providers/ProvidersPage'
import { UsersPage } from '../pages/users/UsersPage'
import { ProtectedRoute } from './ProtectedRoute'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/projects', element: <ProjectsListPage /> },
      { path: '/projects/:id', element: <ProjectDetailPage /> },
      { path: '/providers', element: <ProvidersPage /> },
      { path: '/users', element: <UsersPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
