import React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Database,
  History,
  Link2,
  Settings,
  Sparkles
} from 'lucide-react'
import { useConnectionStore } from '../../store/connectionStore'
import { useSettingsStore } from '../../store/settingsStore'
import { cn } from '../../lib/utils'

export const AppLayout: React.FC = () => {
  const location = useLocation()

  const { activeConnection, connectionStatus, setConnectionStatus } = useConnectionStore()
  const { selectedModel } = useSettingsStore()

  React.useEffect(() => {
    const autoConnect = async () => {
      if (activeConnection && connectionStatus !== 'connected') {
        setConnectionStatus('connecting')
        try {
          const success = await window.electron.ipcRenderer.invoke('db:connect', activeConnection)
          if (success) {
            setConnectionStatus('connected')
          } else {
            setConnectionStatus('error', 'Auto-connect failed')
          }
        } catch (err) {
          console.error('Auto-connect database error:', err)
          setConnectionStatus('error', String(err))
        }
      }
    }
    autoConnect()
  }, [])

  const navItems = [
    { to: '/chat', label: 'Chat', icon: MessageSquare },
    { to: '/schema', label: 'Schema', icon: Database },
    { to: '/connections', label: 'Connections', icon: Link2 },
    { to: '/history', label: 'Query History', icon: History }
  ]

  const getPageTitle = () => {
    if (location.pathname.startsWith('/chat')) return 'AI Chat'
    const active = navItems.find((item) => item.to === location.pathname)
    if (active) return active.label
    if (location.pathname.startsWith('/settings')) return 'Settings'
    return 'SpeakDB'
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar - Transparent background, borderless feel */}
      <aside className="w-60 border-r border-border/80 flex flex-col justify-between p-4 shrink-0 select-none bg-transparent">
        <div className="space-y-6">
          {/* Sidebar Header Title - Clean geometric coral */}
          <div className="flex items-center gap-2.5 px-2 py-3">

            <span className="text-xl font-bold tracking-tight text-primary">
              SpeakDB
            </span>
          </div>

          {/* Main Navigation - Pill shaped elements */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-full px-4 py-2.5 text-xs font-semibold tracking-wide transition-all group duration-150",
                      isActive
                        ? "bg-[#FBE4DC] text-primary"
                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    )
                  }
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Footer Navigation Link for Settings - Pill shaped */}
        <div className="pt-2">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-xs font-semibold tracking-wide transition-all group duration-150",
                isActive
                  ? "bg-[#FBE4DC] text-primary"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              )
            }
          >
            <Settings className="h-4.5 w-4.5 shrink-0" />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Header - Minimal, borderless layout with quiet indicator */}
        <header className="flex h-20 shrink-0 items-center justify-between px-8 select-none bg-transparent">
          <h1 className="text-lg font-bold tracking-tight text-foreground">{getPageTitle()}</h1>

          {/* Quiet Status Indicator Dot + Text */}
          <div className="flex items-center gap-5 text-[11px] font-semibold text-muted-foreground">
            {/* Database Connection */}
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "h-2 w-2 rounded-full shrink-0",
                connectionStatus === 'connected' ? "bg-emerald-500" :
                  connectionStatus === 'connecting' ? "bg-amber-500 animate-pulse" : "bg-neutral-300"
              )} />
              <span className="truncate max-w-[150px]">
                {connectionStatus === 'connected' && activeConnection
                  ? activeConnection.name
                  : connectionStatus === 'connecting'
                    ? 'Connecting...'
                    : 'Disconnected'}
              </span>
            </div>

            {/* AI Model name */}
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{selectedModel}</span>
            </div>
          </div>
        </header>

        {/* Content Pane */}
        <main className="flex-1 overflow-hidden relative bg-transparent px-8 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="h-full w-full overflow-y-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
