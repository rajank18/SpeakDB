import { createHashRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'

// Lazy loaded page components or direct imports. Direct imports are fine for setup.
import Dashboard from '../pages/Dashboard'
import Chat from '../pages/Chat'
import Connections from '../pages/Connections'
import Schema from '../pages/Schema'
import History from '../pages/History'
import Settings from '../pages/Settings'
import About from '../pages/About'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        path: '',
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'chat',
        element: <Chat />
      },
      {
        path: 'connections',
        element: <Connections />
      },
      {
        path: 'schema',
        element: <Schema />
      },
      {
        path: 'history',
        element: <History />
      },
      {
        path: 'settings',
        element: <Settings />
      },
      {
        path: 'about',
        element: <About />
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />
      }
    ]
  }
])
