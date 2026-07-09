import { create } from 'zustand'

export interface DBConnection {
  id: string
  name: string
  type: 'postgres' | 'mysql' | 'sqlite' | 'mssql'
  host?: string
  port?: number
  database: string
  username?: string
  password?: string
  filepath?: string // SQLite file path
  ssl?: boolean
  createdAt: string
}

interface ConnectionState {
  activeConnection: DBConnection | null
  savedConnections: DBConnection[]
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  error: string | null
  setActiveConnection: (conn: DBConnection | null) => void
  setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected' | 'error', error?: string | null) => void
  addConnection: (conn: Omit<DBConnection, 'id' | 'createdAt'>) => void
  removeConnection: (id: string) => void
  updateConnection: (id: string, updates: Partial<DBConnection>) => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  activeConnection: null,
  savedConnections: [],
  connectionStatus: 'disconnected',
  error: null,

  setActiveConnection: (conn) => set({ activeConnection: conn }),
  
  setConnectionStatus: (status, error = null) => set({ connectionStatus: status, error }),

  addConnection: (conn) =>
    set((state) => {
      const newConn: DBConnection = {
        ...conn,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      }
      return { savedConnections: [...state.savedConnections, newConn] }
    }),

  removeConnection: (id) =>
    set((state) => ({
      savedConnections: state.savedConnections.filter((c) => c.id !== id),
      activeConnection: state.activeConnection?.id === id ? null : state.activeConnection
    })),

  updateConnection: (id, updates) =>
    set((state) => {
      const updated = state.savedConnections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      )
      const active = state.activeConnection?.id === id
        ? { ...state.activeConnection, ...updates }
        : state.activeConnection
      return {
        savedConnections: updated,
        activeConnection: active
      }
    })
}))
