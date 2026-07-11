import React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  MessageSquare,
  Database,
  History,
  Link2,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  Sparkles,
  ServerOff
} from 'lucide-react'
import { useConnectionStore } from '../../store/connectionStore'
import { useSettingsStore } from '../../store/settingsStore'
import { cn } from '../../lib/utils'

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false)
  const location = useLocation()
  
  const { activeConnection, connectionStatus, setConnectionStatus } = useConnectionStore()
  const { aiProvider, selectedModel } = useSettingsStore()

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
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/chat', label: 'AI Chat', icon: MessageSquare },
    { to: '/schema', label: 'Schema Explorer', icon: Database },
    { to: '/history', label: 'Query History', icon: History },
    { to: '/connections', label: 'Connections', icon: Link2 },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/about', label: 'About', icon: Info }
  ]

  const getPageTitle = () => {
    const active = navItems.find((item) => item.to === location.pathname)
    return active ? active.label : 'SpeakDB'
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 260 }}
        className={cn(
          "flex flex-col border-r border-border bg-card/40 backdrop-blur-md transition-all duration-300 relative select-none",
          collapsed ? "items-center" : "items-stretch"
        )}
      >
        {/* Sidebar Header */}
        <div className={cn("flex h-16 items-center px-4 border-b border-border justify-between", collapsed && "justify-center px-0")}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <DatabaseZap className="h-5 w-5" />
            </div>
            {!collapsed && (
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                SpeakDB
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapsed Expand Trigger */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute right-[-12px] top-4 z-50 rounded-full border border-border bg-card p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}

        {/* Nav Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group duration-150",
                    isActive
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )
                }
              >
                <Icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-105")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar Footer Status Indicator */}
        <div className="p-3 border-t border-border bg-card/20 space-y-2.5">
          {/* DB Connection Status */}
          <div className={cn("flex items-center gap-3 rounded-lg bg-background/50 border border-border/30 p-2", collapsed && "justify-center p-1.5")}>
            {connectionStatus === 'connected' && activeConnection ? (
              <>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                {!collapsed && (
                  <div className="flex flex-col text-left overflow-hidden min-w-0">
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider leading-none">Connected</span>
                    <span className="text-xs text-foreground font-medium truncate mt-0.5">{activeConnection.name}</span>
                  </div>
                )}
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                {!collapsed && (
                  <div className="flex flex-col text-left overflow-hidden min-w-0">
                    <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider leading-none">Connecting</span>
                    <span className="text-xs text-muted-foreground truncate mt-0.5">Establishing link...</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <ServerOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {!collapsed && (
                  <div className="flex flex-col text-left overflow-hidden min-w-0">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">Offline</span>
                    <span className="text-xs text-muted-foreground truncate mt-0.5">No active connection</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* AI Model Status */}
          <div className={cn("flex items-center gap-3 rounded-lg bg-background/50 border border-border/30 p-2", collapsed && "justify-center p-1.5")}>
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse-slow" />
            {!collapsed && (
              <div className="flex flex-col text-left overflow-hidden min-w-0">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider leading-none">AI Provider</span>
                <span className="text-xs font-medium truncate mt-0.5 capitalize">{aiProvider} ({selectedModel})</span>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Workspace Frame */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/10 backdrop-blur-md px-6 select-none">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{getPageTitle()}</h1>
          </div>
          
          {/* Quick Header Widget */}
          <div className="flex items-center gap-4 text-xs">
            {activeConnection && (
              <div className="flex items-center gap-2 rounded-full bg-muted/40 border border-border/50 px-3 py-1 text-muted-foreground font-medium">
                <Database className="h-3.5 w-3.5" />
                <span>{activeConnection.type.toUpperCase()}: {activeConnection.database}</span>
              </div>
            )}
            <div className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-primary font-medium">
              Model: {selectedModel}
            </div>
          </div>
        </header>

        {/* Content Pane */}
        <main className="flex-1 overflow-hidden relative bg-background">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="h-full w-full overflow-y-auto p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
