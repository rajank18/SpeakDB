import React from 'react'
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Database,
  Sparkles,
  Play,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { useConnectionStore } from '../../store/connectionStore'
import { useSettingsStore } from '../../store/settingsStore'
import { cn } from '../../lib/utils'

const Chat: React.FC = () => {
  const {
    threads,
    activeThreadId,
    isGenerating,
    createThread,
    deleteThread,
    setActiveThreadId,
    addMessage,
    setIsGenerating
  } = useChatStore()

  const { activeConnection } = useConnectionStore()
  const { selectedModel, safeMode } = useSettingsStore()

  const [input, setInput] = React.useState('')
  const chatEndRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of chat
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threads, activeThreadId])

  const activeThread = threads.find((t) => t.id === activeThreadId)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isGenerating || !activeThreadId) return

    const userPrompt = input.trim()
    setInput('')

    // 1. Add User Message
    addMessage(activeThreadId, {
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
      
      addMessage(activeThreadId, {
        role: 'assistant',
        content: aiResponse.explanation,
        sql: aiResponse.sql
      })
    } catch (err: any) {
      addMessage(activeThreadId, {
        role: 'assistant',
        content: `Error generating SQL query: ${err.message || String(err)}`,
        isError: true
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExecute = async (msgId: string, sql: string) => {
    try {
      const maxRows = useSettingsStore.getState().maxRows
      const result = await window.electron.ipcRenderer.invoke('db:execute-query', sql, maxRows)
      
      useChatStore.getState().updateMessage(activeThreadId!, msgId, {
        queryResult: result
      })
    } catch (err: any) {
      useChatStore.getState().updateMessage(activeThreadId!, msgId, {
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
    createThread('Conversation ' + (threads.length + 1))
  }

  const quickPrompts = [
    'List all active customer users',
    'Summarize monthly transaction amounts',
    'Search for columns containing &quot;payment&quot;',
    'Display schema definitions'
  ]

  return (
    <div className="flex h-[calc(100vh-80px)] m-[-24px] overflow-hidden animate-fade-in">
      {/* Threads Sidebar panel */}
      <div className="w-64 border-r border-border bg-card/20 flex flex-col shrink-0 select-none">
        <div className="p-4 border-b border-border">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all py-2 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground p-6 mt-4">
              No threads yet.
            </div>
          ) : (
            threads.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-center justify-between group rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition-all",
                  activeThreadId === t.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                onClick={() => setActiveThreadId(t.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t.title}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteThread(t.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col bg-background/5 overflow-hidden">
        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!activeThreadId ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 animate-fade-in select-none">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center animate-pulse">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Start a New Conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Ask natural language questions about your database schema, let AI write the optimal SQL query, and preview the data instantly.
                </p>
              </div>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all"
              >
                <span>Create Conversation Thread</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : activeThread?.messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center max-w-xl mx-auto space-y-8 animate-fade-in select-none">
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-bold tracking-tight">Ask anything about your Database</h3>
                <p className="text-sm text-muted-foreground">
                  Model: <span className="text-primary font-semibold">{selectedModel}</span> | Connected: <span className="text-emerald-400 font-semibold">{activeConnection ? activeConnection.name : 'Offline'}</span>
                </p>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-2 gap-4">
                {quickPrompts.map((prompt, i) => (
                  <div
                    key={i}
                    onClick={() => setInput(prompt.replace(/&quot;/g, '"'))}
                    className="border border-border/50 bg-card/20 rounded-xl p-4 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all space-y-1 text-left"
                  >
                    <HelpCircle className="h-4.5 w-4.5 text-primary" />
                    <p className="text-xs font-semibold text-foreground">{prompt.replace(/&quot;/g, '"')}</p>
                    <p className="text-[10px] text-muted-foreground">AI template suggestion</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {activeThread?.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex gap-4 p-4 rounded-xl border",
                    m.role === 'user'
                      ? "bg-card/10 border-border/40"
                      : "bg-card/40 border-border/70"
                  )}
                >
                  {/* Avatar */}
                  <div className="shrink-0">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm",
                      m.role === 'user' ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                    )}>
                      {m.role === 'user' ? 'U' : 'AI'}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold capitalize text-muted-foreground">{m.role}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-sm text-white leading-relaxed font-semibold tracking-wide">{m.content}</p>

                    {/* SQL Panel */}
                    {m.sql && (
                      <div className="border border-border bg-background rounded-lg overflow-hidden mt-3 shadow-inner">
                        <div className="bg-card/50 px-4 py-2 border-b border-border flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Database className="h-3.5 w-3.5 text-primary" />
                            SQL QUERY (GENERATED)
                          </span>
                          <span>SYNTAX HIGHLIGHTING ACTIVE</span>
                        </div>
                        <pre className="p-4 overflow-x-auto text-[11px] text-indigo-200 leading-relaxed font-semibold">
                          <code>{m.sql}</code>
                        </pre>
                        
                        {/* Execute Bar */}
                        {!m.queryResult && (
                          <div className="px-4 py-2 bg-card/20 border-t border-border flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              {safeMode && <span className="text-amber-400 font-semibold uppercase">Safe Mode:</span>}
                              Needs confirmation before execution
                            </span>
                            <button
                              onClick={() => handleExecute(m.id, m.sql!)}
                              disabled={!activeConnection}
                              className={cn(
                                "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-all",
                                activeConnection
                                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
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

                    {/* Query Result Grid */}
                    {(() => {
                      const result = m.queryResult
                      if (!result) return null
                      return (
                        <div className="border border-border/80 bg-background/60 rounded-lg overflow-hidden mt-3 animate-fade-in shadow">
                          <div className="bg-muted/40 px-4 py-2 border-b border-border/80 flex justify-between items-center text-[10px] font-semibold text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              EXECUTION SUCCESSFUL ({result.rows.length} rows returned)
                            </span>
                            <span>Time: {result.executionTimeMs}ms</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-[11px] border-collapse text-left">
                              <thead>
                                <tr className="border-b border-border bg-card/30">
                                  {result.columns.map((col) => (
                                    <th key={col} className="p-2.5 font-bold text-muted-foreground uppercase tracking-wider">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {result.rows.map((row, i) => (
                                  <tr key={i} className="border-b border-border/40 hover:bg-card/10">
                                    {result.columns.map((col) => (
                                      <td key={col} className="p-2.5 text-white font-bold text-sm tracking-wide">{String(row[col])}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex gap-4 p-4 rounded-xl border bg-card/40 border-border/70 animate-pulse">
                  <div className="shrink-0">
                    <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      AI
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 mt-1">
                    <div className="h-3 bg-muted rounded w-16" />
                    <div className="h-3.5 bg-muted rounded w-full" />
                    <div className="h-3.5 bg-muted rounded w-3/4" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Dock Area */}
        <div className="p-4 border-t border-border bg-card/10 select-none">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-center gap-3 relative">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={
                  !activeThreadId 
                    ? "Create a conversation thread first..." 
                    : activeConnection
                    ? "Ask your database in natural language..."
                    : "Connect to a DB first to enable execution, or write a schema prompt..."
                }
                disabled={!activeThreadId || isGenerating}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-card/40 border border-border/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/40 rounded-xl px-4 py-3 text-xs placeholder-muted-foreground outline-none text-foreground transition-all pr-12"
              />
              <button
                type="submit"
                disabled={!activeThreadId || !input.trim() || isGenerating}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white transition-all shadow-sm",
                  input.trim() && activeThreadId && !isGenerating
                    ? "bg-primary hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
          <div className="max-w-3xl mx-auto mt-2 flex justify-between items-center text-[10px] text-muted-foreground px-2">
            <span>Model: {selectedModel}</span>
            <span>Ensure credentials are configured securely in Settings</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat
