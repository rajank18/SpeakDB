import { createHashRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'

// Page components
import Chat from '../pages/Chat'
import Connections from '../pages/Connections'
import Schema from '../pages/Schema'
import History from '../pages/History'
import Settings from '../pages/Settings'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        path: '',
        element: <Navigate to="/chat" replace />
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
        path: '*',
        element: <Navigate to="/chat" replace />
      }
    ]
  }
])
