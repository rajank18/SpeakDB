import React from 'react'
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Database,
  Sparkles,
  Play,
  Clock,
  Pencil
} from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { useConnectionStore } from '../../store/connectionStore'
import { useSettingsStore } from '../../store/settingsStore'
import { cn } from '../../lib/utils'

const renderFormattedText = (text: string) => {
  if (!text) return null
  return (
    <div className="space-y-1.5 whitespace-pre-wrap break-words text-[14px] text-foreground leading-relaxed font-normal">
      {text.split('\n').map((line, lineIdx) => {
        const parts = line.split(/(\*\*.*?\*\*)/g)
        return (
          <div key={lineIdx} className="min-h-[1.2rem]">
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={partIdx} className="text-primary font-bold">
                    {part.slice(2, -2)}
                  </strong>
                )
              }
              return part
            })}
          </div>
        )
      })}
    </div>
  )
}

const Chat: React.FC = () => {
  const {
    threads,
    activeThreadId,
    isGenerating,
    createThread,
    deleteThread,
    setActiveThreadId,
    addMessage,
    setIsGenerating,
    renameThread
  } = useChatStore()

  const {
    activeConnection,
    savedConnections,
    setActiveConnection,
    setConnectionStatus
  } = useConnectionStore()
  
  useSettingsStore()

  const [input, setInput] = React.useState('')
  const [editingThreadId, setEditingThreadId] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState('')
  const [showHistory, setShowHistory] = React.useState(false)
  
  const chatEndRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of chat
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threads, activeThreadId])

  // Auto-activate first thread on launch if conversations exist
  React.useEffect(() => {
    if (!activeThreadId && threads.length > 0) {
      setActiveThreadId(threads[0].id)
    }
  }, [threads, activeThreadId, setActiveThreadId])

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

  const handleDatabaseChange = async (connId: string) => {
    if (!connId) {
      try {
        await window.electron.ipcRenderer.invoke('db:disconnect')
      } catch (err) {
        console.error('Failed to disconnect database:', err)
      }
      setActiveConnection(null)
      setConnectionStatus('disconnected')
      return
    }

    const conn = savedConnections.find((c) => c.id === connId)
    if (!conn) return

    setConnectionStatus('connecting')
    try {
      const success = await window.electron.ipcRenderer.invoke('db:connect', conn)
      if (success) {
        setActiveConnection(conn)
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('error', 'Failed to connect to database.')
      }
    } catch (e: any) {
      setConnectionStatus('error', e.message || String(e))
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isGenerating) return

    // Auto-create thread if there are no threads
    let targetThreadId = activeThreadId
    if (!targetThreadId) {
      targetThreadId = createThread('Conversation ' + (threads.length + 1))
    }

    const userPrompt = input.trim()
    setInput('')

    // 1. Add User Message
    addMessage(targetThreadId, {
      role: 'user',
      content: userPrompt
    })

    // 2. Dispatch query to OpenRouter/Ollama via main process
    setIsGenerating(true)

    try {
      let schemaContext = null
      if (activeConnection) {
        schemaContext = await window.electron.ipcRenderer.invoke('db:get-schema')
      }

      const settings = useSettingsStore.getState()
      const aiConfig = {
        provider: settings.aiProvider,
        apiKey: settings.aiProvider === 'openrouter' 
          ? settings.openRouterKey 
          : settings.aiProvider === 'openai' 
          ? settings.openAIKey 
          : settings.aiProvider === 'gemini' 
          ? settings.geminiKey 
          : undefined,
        modelName: settings.selectedModel,
        endpointUrl: settings.aiProvider === 'ollama' ? settings.ollamaUrl : undefined
      }

      const aiResponse = await window.electron.ipcRenderer.invoke('ai:generate-sql', userPrompt, schemaContext, aiConfig)
      
      addMessage(targetThreadId, {
        role: 'assistant',
        content: aiResponse.explanation,
        sql: aiResponse.sql
      })
    } catch (err: any) {
      addMessage(targetThreadId, {
        role: 'assistant',
        content: `Error generating SQL query: ${err.message || String(err)}`,
        isError: true
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExecute = async (msgId: string, sql: string) => {
    if (!activeThreadId) return
    try {
      const maxRows = useSettingsStore.getState().maxRows
      const result = await window.electron.ipcRenderer.invoke('db:execute-query', sql, maxRows)
      
      useChatStore.getState().updateMessage(activeThreadId, msgId, {
        queryResult: result
      })

      // Fetch natural language interpretation of database results
      if (result && !result.error && result.rows.length > 0) {
        let question = "Summarize the database results."
        const thread = threads.find((t) => t.id === activeThreadId)
        if (thread) {
          const msgIdx = thread.messages.findIndex((m) => m.id === msgId)
          if (msgIdx > 0) {
            question = thread.messages[msgIdx - 1].content
          }
        }

        const settings = useSettingsStore.getState()
        const aiConfig = {
          provider: settings.aiProvider,
          apiKey: settings.aiProvider === 'openrouter' 
            ? settings.openRouterKey 
            : settings.aiProvider === 'openai' 
            ? settings.openAIKey 
            : settings.aiProvider === 'gemini' 
            ? settings.geminiKey 
            : undefined,
          modelName: settings.selectedModel,
          endpointUrl: settings.aiProvider === 'ollama' ? settings.ollamaUrl : undefined
        }

        const interpretation = await window.electron.ipcRenderer.invoke(
          'ai:interpret-results',
          question,
          sql,
          result,
          aiConfig
        )

        useChatStore.getState().updateMessage(activeThreadId, msgId, {
          interpretation
        })
      }
    } catch (err: any) {
      useChatStore.getState().updateMessage(activeThreadId, msgId, {
        queryResult: {
          columns: ['Error'],
          rows: [{ Error: err.message || String(err) }],
          executionTimeMs: 0,
          error: err.message
        }
      })
    }
  }

  const handleNewChat = () => {
    const id = createThread('Conversation ' + (threads.length + 1))
    setActiveThreadId(id)
    setShowHistory(false)
  }

  const activeThread = threads.find((t) => t.id === activeThreadId)

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] relative select-none">
      {/* Top Header Controls (Thread History Toggle in Top Right) */}
      <div className="absolute top-[-44px] right-0 z-40">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={cn(
            "p-2 rounded-full hover:bg-muted/40 transition-all text-muted-foreground hover:text-foreground",
            showHistory && "text-primary hover:bg-[#FBE4DC]"
          )}
          title="Chat History"
        >
          <Clock className="h-4.5 w-4.5" />
        </button>

        {/* History Dropdown Panel - Clean Warm Paper Card */}
        {showHistory && (
          <div className="absolute right-0 top-9 w-64 bg-card border border-border/80 rounded-2xl shadow-lg p-2.5 space-y-1.5 animate-fade-in z-50">
            <div className="flex items-center justify-between px-2 pb-2 border-b border-border/50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Conversations</span>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {threads.length === 0 ? (
                <div className="text-center text-[11px] text-muted-foreground py-4">No past conversations.</div>
              ) : (
                threads.map((t) => (
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
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Workspace Frame */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden">
        {/* Chat Feed Panel */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {!activeThreadId || !activeThread || activeThread.messages.length === 0 ? (
            /* Empty State Landing Screen */
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto space-y-8 animate-fade-in select-none">
              <h2 className="text-[32px] font-semibold tracking-tight text-foreground text-center">
                What do you want to ask?
              </h2>
              
              {/* Full-Pill input box overlay for search landing */}
              <form onSubmit={handleSend} className="w-full">
                <div className="bg-white border border-border rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-4 py-2 flex items-center gap-3 relative h-14">
                  {/* Embedded source selector dropdown chip */}
                  <div className="relative shrink-0">
                    <select
                      value={activeConnection?.id || ''}
                      onChange={(e) => handleDatabaseChange(e.target.value)}
                      disabled={isGenerating}
                      className="bg-muted/40 border border-border/80 text-muted-foreground text-[10px] font-bold rounded-full pl-3 pr-7 py-1 outline-none cursor-pointer h-8 appearance-none select-none max-w-[120px] truncate"
                    >
                      <option value="" className="bg-background">🔌 Demo</option>
                      {savedConnections.map((c) => (
                        <option key={c.id} value={c.id} className="bg-background">
                          📦 {c.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted-foreground">
                      <span className="text-[9px]">▾</span>
                    </div>
                  </div>

                  {/* Search query input */}
                  <input
                    type="text"
                    placeholder="Ask anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder-ink-faint px-1 h-full"
                  />

                  {/* Circular send triggers */}
                  <button
                    type="submit"
                    disabled={!input.trim() || isGenerating}
                    className={cn(
                      "rounded-full h-8 w-8 flex items-center justify-center text-white shrink-0 shadow-sm transition-all",
                      input.trim() && !isGenerating
                        ? "bg-primary hover:bg-primary/95 hover:scale-105"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    <Send className="h-3.5 w-3.5 fill-current rotate-45 mr-0.5" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Active Message History Feed */
            <div className="max-w-3xl mx-auto space-y-8 select-text">
              {activeThread.messages.map((m) => (
                <div key={m.id} className={cn("flex flex-col space-y-2 animate-fade-in w-full", m.role === 'user' ? "items-end" : "items-start")}>
                  {/* Meta Label Line */}
                  <div className={cn("flex items-center gap-2", m.role === 'user' && "flex-row-reverse")}>
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      m.role === 'user' ? "bg-[#FBE4DC] text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {m.role === 'user' ? 'U' : 'AI'}
                    </div>
                    <span className="text-xs font-bold text-foreground capitalize">
                      {m.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Main text content - Clean, borderless */}
                  <div className={cn("w-full max-w-[85%]", m.role === 'user' ? "pr-8 text-right" : "pl-8 text-left")}>
                    {renderFormattedText(m.content)}

                    {/* SQL generated panel */}
                    {m.sql && (
                      <div className="rounded-xl overflow-hidden mt-3 code-card border border-border/40 max-w-full">
                        <div className="bg-[#E7E3D8]/30 px-4 py-2 border-b border-border/40 flex justify-between items-center text-[10px] font-bold text-muted-foreground tracking-wide select-none">
                          <span className="flex items-center gap-1.5 uppercase">
                            <Database className="h-3.5 w-3.5 text-primary" />
                            SQL Query
                          </span>
                        </div>
                        <pre className="p-4 overflow-x-auto text-[11px] font-medium leading-relaxed">
                          <code>{m.sql}</code>
                        </pre>
                        
                        {/* Execute parameters */}
                        {!m.queryResult && (
                          <div className="px-4 py-2 bg-[#E7E3D8]/20 border-t border-border/40 flex justify-between items-center select-none">
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              Needs confirmation before execution
                            </span>
                            <button
                              onClick={() => handleExecute(m.id, m.sql!)}
                              disabled={!activeConnection}
                              className={cn(
                                "flex items-center gap-1.5 text-xs font-semibold px-4.5 py-1.5 rounded-full shadow-sm transition-all",
                                activeConnection
                                  ? "bg-primary text-white hover:bg-primary/95"
                                  : "bg-muted text-muted-foreground cursor-not-allowed"
                              )}
                            >
                              <Play className="h-3 w-3 fill-current" />
                              <span>Execute Query</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SQL query execution outputs */}
                    {(() => {
                      const result = m.queryResult
                      if (!result) return null
                      return (
                        <div className="space-y-3 mt-3">
                          {/* Compact Result Indicator Banner */}
                          <div className="flex items-center gap-2 select-none text-[10px] font-bold text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>EXECUTION SUCCESSFUL ({result.rows.length} rows · {result.executionTimeMs}ms)</span>
                          </div>

                          {/* Flat Grid table */}
                          <div className="border border-border/80 bg-white rounded-xl overflow-hidden shadow-sm max-w-full">
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px] border-collapse text-left">
                                <thead>
                                  <tr className="border-b border-border bg-muted/20">
                                    {result.columns.map((col) => (
                                      <th key={col} className="p-2.5 font-bold text-muted-foreground uppercase tracking-wider">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.rows.map((row, i) => (
                                    <tr key={i} className="border-b border-border/30 hover:bg-muted/10">
                                      {result.columns.map((col) => (
                                        <td key={col} className="p-2.5 text-foreground font-semibold text-xs">{String(row[col])}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* AI Explanation cards */}
                          <div className="bg-[#FBE4DC]/40 border border-primary/10 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary mb-1 uppercase tracking-wider select-none">
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>AI Explanation of Results</span>
                            </div>
                            {m.interpretation ? (
                              <div className="text-xs text-foreground font-medium leading-relaxed">
                                {renderFormattedText(m.interpretation)}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse select-none">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                <span>AI is analyzing the database results...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex gap-4 p-4 rounded-xl animate-pulse">
                  <div className="shrink-0">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                      AI
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 mt-1">
                    <div className="h-3 bg-muted rounded w-16" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Persistent Chat Input Dock bar (rendered when feed is active) */}
        {activeThreadId && activeThread && activeThread.messages.length > 0 && (
          <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur select-none">
            <form onSubmit={handleSend} className="max-w-3xl mx-auto">
              <div className="bg-white border border-border rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-4 py-2 flex items-center gap-3 relative h-12">
                {/* SelectorDropdown */}
                <div className="relative shrink-0">
                  <select
                    value={activeConnection?.id || ''}
                    onChange={(e) => handleDatabaseChange(e.target.value)}
                    disabled={isGenerating}
                    className="bg-muted/40 border border-border/80 text-muted-foreground text-[10px] font-bold rounded-full pl-3 pr-7 py-1 outline-none cursor-pointer h-8 appearance-none select-none max-w-[120px] truncate"
                  >
                    <option value="" className="bg-background">🔌 Demo</option>
                    {savedConnections.map((c) => (
                      <option key={c.id} value={c.id} className="bg-background">
                        📦 {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted-foreground">
                    <span className="text-[9px]">▾</span>
                  </div>
                </div>

                {/* Text query bar */}
                <input
                  type="text"
                  placeholder="Ask anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder-ink-faint px-1 h-full"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isGenerating}
                  className={cn(
                    "rounded-full h-8 w-8 flex items-center justify-center text-white shrink-0 shadow-sm transition-all",
                    input.trim() && !isGenerating
                      ? "bg-primary hover:bg-primary/95 hover:scale-105"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <Send className="h-3.5 w-3.5 fill-current rotate-45 mr-0.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default Chat
