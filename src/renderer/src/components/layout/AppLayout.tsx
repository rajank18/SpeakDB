import React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Database,
  History,
  Settings,
  Plus,
  Clock,
  Pencil,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Link2
} from 'lucide-react'
import { useConnectionStore } from '../../store/connectionStore'
import { useChatStore } from '../../store/chatStore'
import { cn } from '../../lib/utils'

export const AppLayout: React.FC = () => {
  const location = useLocation()
  const [collapsed, setCollapsed] = React.useState(false)

  const { activeConnection, connectionStatus, setConnectionStatus } = useConnectionStore()

  // Zustand chat states for top right controls
  const {
    threads,
    activeThreadId,
    createThread,
    setActiveThreadId,
    renameThread,
    deleteThread
  } = useChatStore()

  const [showHistory, setShowHistory] = React.useState(false)
  const [editingThreadId, setEditingThreadId] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState('')

  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    if (useConnectionStore.persist.hasHydrated()) {
      setHydrated(true)
    }
    const unsub = useConnectionStore.subscribe(() => {
      if (useConnectionStore.persist.hasHydrated()) {
        setHydrated(true)
      }
    })
    return unsub
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
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
  }, [hydrated, activeConnection])

  const handleNewChat = () => {
    const threadId = createThread()
    setActiveThreadId(threadId)
    setShowHistory(false)
  }

  const handleStartRename = (id: string, currentTitle: string) => {
    setEditingThreadId(id)
    setEditingTitle(currentTitle)
  }

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      renameThread(id, editingTitle.trim())
    }
    setEditingThreadId(null)
  }

  const navItems = [
    { to: '/chat', label: 'Chat', icon: MessageSquare },
    { to: '/schema', label: 'Schema', icon: Database },
    { to: '/connections', label: 'Connections', icon: Link2 },
    { to: '/history', label: 'Query History', icon: History }
  ]

  const getPageTitle = () => {
    if (location.pathname.startsWith('/chat')) return 'AI Chat'
    if (location.pathname.startsWith('/schema')) return 'Schema'
    if (location.pathname.startsWith('/connections')) return 'Connections'
    if (location.pathname.startsWith('/history')) return 'Query History'
    if (location.pathname.startsWith('/settings')) return 'Settings'
    return 'SpeakDB'
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground animate-fade-in">
      {/* Sidebar - Collapsible, Transparent background, borderless feel */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="border-r border-border/80 flex flex-col justify-between p-4 shrink-0 select-none bg-transparent overflow-hidden"
      >
        <div className="space-y-6">
          {/* Sidebar Header Title - Clean geometric coral with toggle collapse icon */}
          <div className={cn("flex items-center py-3", collapsed ? "justify-center px-0" : "justify-between px-2")}>
            {!collapsed ? (
              <>
                <div className="flex items-center gap-2.5">

                  <span className="text-xl font-bold tracking-tight text-primary truncate">
                    SpeakDB
                  </span>
                </div>
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all shrink-0 animate-fade-in"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setCollapsed(false)}
                className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-[#FBE4DC]/50 transition-all shrink-0 animate-fade-in"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="h-4.5 w-4.5" />
              </button>
            )}
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
                      "flex items-center gap-3 rounded-full py-2.5 text-xs font-semibold tracking-wide transition-all group duration-150",
                      collapsed ? "justify-center px-2" : "px-4",
                      isActive
                        ? "bg-[#FBE4DC] text-primary"
                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    )
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
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
                "flex items-center gap-3 rounded-full mb-9 py-2.5 text-xs font-semibold tracking-wide transition-all group duration-150",
                collapsed ? "justify-center px-2" : "px-4",
                isActive
                  ? "bg-[#FBE4DC] text-primary"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              )
            }
            title={collapsed ? "Settings" : undefined}
          >
            <Settings className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>
        </div>
      </motion.aside>

      {/* Main Workspace Frame */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Header - Minimal, borderless layout with quiet indicator */}
        <header className="flex h-20 shrink-0 items-center justify-between px-8 select-none bg-transparent">
          <h1 className="text-lg font-bold tracking-tight text-foreground">{getPageTitle()}</h1>

          {/* Header Controls (Plus & Clock history shown on Chat path) */}
          <div className="flex items-center gap-4">
            {location.pathname.startsWith('/chat') && (
              <div className="flex items-center gap-1.5 relative">
                {/* Plus Button - Always visible to start a new chat */}
                <button
                  onClick={handleNewChat}
                  className="p-2 rounded-full hover:bg-muted/40 transition-all text-muted-foreground hover:text-foreground shrink-0"
                  title="New Chat"
                >
                  <Plus className="h-4.5 w-4.5" />
                </button>

                {/* History Toggle Button - Only visible if chats exist */}
                {threads.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className={cn(
                        "p-2 rounded-full hover:bg-muted/40 transition-all text-muted-foreground hover:text-foreground shrink-0",
                        showHistory && "text-primary bg-[#FBE4DC]"
                      )}
                      title="Chat History"
                    >
                      <Clock className="h-4.5 w-4.5" />
                    </button>

                    {/* History Dropdown Panel - Clean Warm Paper Card */}
                    {showHistory && (
                      <div className="absolute right-0 top-9 w-64 bg-card border border-border/80 rounded-2xl shadow-lg p-2.5 space-y-1.5 animate-fade-in z-50 select-none text-left font-normal text-xs text-foreground">
                        <div className="flex items-center justify-between px-2 pb-2 border-b border-border/50">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Conversations</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1 mt-1">
                          {threads.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => {
                                setActiveThreadId(t.id)
                                setShowHistory(false)
                              }}
                              className={cn(
                                "flex items-center justify-between group rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer transition-all",
                                activeThreadId === t.id
                                  ? "bg-[#FBE4DC] text-primary"
                                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
                                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                                {editingThreadId === t.id ? (
                                  <input
                                    type="text"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onBlur={() => handleSaveRename(t.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRename(t.id)
                                      if (e.key === 'Escape') setEditingThreadId(null)
                                    }}
                                    className="bg-card border border-border/80 focus:border-primary/50 outline-none text-[11px] rounded px-1.5 w-full text-foreground py-0.5"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span className="truncate">{t.title}</span>
                                )}
                              </div>
                              {editingThreadId !== t.id && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStartRename(t.id, t.title)
                                    }}
                                    className="p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteThread(t.id)
                                    }}
                                    className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
              className="h-full w-full overflow-y-auto overflow-x-hidden"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
