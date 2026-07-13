import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send,
  Sparkles,
  Play,
  ChevronDown,
  Database
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
    setActiveThreadId,
    addMessage,
    setIsGenerating
  } = useChatStore()

  const {
    activeConnection,
    savedConnections,
    setActiveConnection,
    setConnectionStatus,
    connectionStatus
  } = useConnectionStore()

  useSettingsStore()
  const navigate = useNavigate()

  const [input, setInput] = React.useState('')
  const [showDbDropdown, setShowDbDropdown] = React.useState(false)
  const [destructiveQueryToConfirm, setDestructiveQueryToConfirm] = React.useState<{ msgId: string; sql: string } | null>(null)

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

  const isDestructiveQuery = (sql: string): boolean => {
    const cleanSql = sql.trim().toUpperCase()
    return (
      cleanSql.includes('DROP ') ||
      cleanSql.includes('DELETE ') ||
      cleanSql.includes('TRUNCATE ')
    )
  }

  const runExecution = async (msgId: string, sql: string) => {
    if (!activeThreadId) return
    try {
      const maxRows = useSettingsStore.getState().maxRows
      const result = await window.electron.ipcRenderer.invoke('db:execute-query', sql, maxRows)

      useChatStore.getState().updateMessage(activeThreadId, msgId, {
        queryResult: result
      })

      // For queries that return 0 rows (ALTER, CREATE, INSERT, UPDATE, DROP, etc.)
      // set a local interpretation immediately instead of calling the AI
      if (!result || result.error) {
        useChatStore.getState().updateMessage(activeThreadId, msgId, {
          interpretation: `Query failed: ${result?.error || 'Unknown error'}`
        })
      } else if (result.rows.length === 0) {
        // DDL/DML commands with 0 rows returned
        const upperSql = sql.trim().toUpperCase()
        let action = 'executed'
        if (upperSql.startsWith('ALTER')) action = 'altered'
        else if (upperSql.startsWith('CREATE')) action = 'created'
        else if (upperSql.startsWith('INSERT')) action = 'inserted'
        else if (upperSql.startsWith('UPDATE')) action = 'updated'
        else if (upperSql.startsWith('DELETE')) action = 'deleted'
        else if (upperSql.startsWith('DROP')) action = 'dropped'
        else if (upperSql.startsWith('TRUNCATE')) action = 'truncated'

        useChatStore.getState().updateMessage(activeThreadId, msgId, {
          interpretation: `Query ${action} successfully in ${result.executionTimeMs}ms. No rows returned.`
        })
      } else {
        // Rows returned - call AI interpreter with enriched context
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

        // Enrich result with execution metadata for AI context
        const enrichedResult = {
          ...result,
          _meta: {
            status: result.error ? 'failed' : 'success',
            rowCount: result.rows.length,
            executionTimeMs: result.executionTimeMs
          }
        }

        const interpretation = await window.electron.ipcRenderer.invoke(
          'ai:interpret-results',
          question,
          sql,
          enrichedResult,
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

  const handleExecute = async (msgId: string, sql: string) => {
    if (isDestructiveQuery(sql)) {
      setDestructiveQueryToConfirm({ msgId, sql })
    } else {
      await runExecution(msgId, sql)
    }
  }



  const activeThread = threads.find((t) => t.id === activeThreadId)

  return (
    <div className="flex flex-col h-full overflow-hidden relative select-none">


      {/* Main Content Workspace Frame */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden">
        {/* Chat Feed Panel */}
        <div className="flex-1 overflow-y-auto py-4 pb-24 space-y-6">
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
                    <button
                      type="button"
                      onClick={() => setShowDbDropdown(!showDbDropdown)}
                      disabled={isGenerating}
                      className="bg-[#F4F1E9]/80 border border-border/80 text-muted-foreground text-[10px] font-bold rounded-full pl-3 pr-2.5 py-1 outline-none cursor-pointer h-8 flex items-center gap-1.5 hover:bg-[#F4F1E9] transition-all select-none"
                    >
                      {/* Connection status indicator dot */}
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        !activeConnection ? "bg-neutral-300" :
                          connectionStatus === 'connected' ? "bg-emerald-500" :
                            connectionStatus === 'connecting' ? "bg-amber-500 animate-pulse" : "bg-neutral-300"
                      )} />
                      <span className="max-w-[80px] truncate">
                        {activeConnection?.name || 'Demo'}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>

                    {showDbDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowDbDropdown(false)}
                        />
                        <div className="absolute left-0 top-9 z-50 w-48 bg-card border border-border/80 rounded-2xl shadow-lg p-1.5 animate-fade-in space-y-0.5 select-none text-left">
                          <div
                            onClick={() => {
                              handleDatabaseChange('')
                              setShowDbDropdown(false)
                            }}
                            className={cn(
                              "px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer hover:bg-muted/40 transition-all flex items-center gap-2",
                              !activeConnection ? "text-primary bg-[#FBE4DC]" : "text-muted-foreground"
                            )}
                          >

                          </div>
                          {savedConnections.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                handleDatabaseChange(c.id)
                                setShowDbDropdown(false)
                              }}
                              className={cn(
                                "px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer hover:bg-muted/40 transition-all flex items-center gap-2",
                                activeConnection?.id === c.id ? "text-primary bg-[#FBE4DC]" : "text-muted-foreground"
                              )}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="truncate">{c.name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
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
                <div key={m.id} className={cn("flex flex-col w-full animate-fade-in", m.role === 'user' ? "items-end" : "items-start")}>
                  {m.role === 'user' ? (
                    /* User Message - Wrapped inside primary/20 rounded box bubble */
                    <div className="bg-primary/20 text-foreground px-4 py-2.5 rounded-[18px] max-w-[75%] break-words select-text text-left text-xs font-semibold leading-relaxed">
                      {renderFormattedText(m.content)}
                    </div>
                  ) : (
                    /* AI Message - Borderless, left-aligned layout containing code cards and grids */
                    <div className="w-full max-w-[95%] select-text text-left space-y-3">
                      <div className="text-xs font-semibold text-foreground leading-relaxed">
                        {renderFormattedText(m.content)}
                      </div>

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
                                  "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[30px]  shadow-sm transition-all",
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
                        const hasRows = result.rows.length > 0
                        const isError = !!result.error
                        return (
                          <div className="space-y-3 mt-3">
                            {/* Compact Result Indicator Banner */}
                            <div className="flex items-center gap-2 select-none text-[10px] font-bold text-muted-foreground">
                              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", isError ? "bg-red-500" : "bg-emerald-500")} />
                              <span>{isError ? 'EXECUTION FAILED' : `EXECUTION SUCCESSFUL (${result.rows.length} rows · ${result.executionTimeMs}ms)`}</span>
                            </div>

                            {/* Flat Grid table - only render when rows exist */}
                            {hasRows && (
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
                            )}

                            {/* AI Explanation card */}
                            <div className="bg-[#FBE4DC]/40 border border-primary/10 rounded-xl p-3">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary mb-1 uppercase tracking-wider select-none">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>AI Explanation</span>
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
                  )}
                </div>
              ))}
              {isGenerating && (
                <div className="w-full max-w-[70%] animate-pulse space-y-2 py-4 select-none">
                  <div className="h-3 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Persistent Chat Input Dock bar (rendered when feed is active) */}
        {activeThreadId && activeThread && activeThread.messages.length > 0 && (
          <div className="absolute bottom-0 left-0 right-1 pb-4   bg-transparent select-none">
            <form onSubmit={handleSend} className="max-w-3xl mx-auto">
              <div className="bg-card/75 backdrop-blur-md border border-border rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-4 py-2 flex items-center gap-3 relative h-12">
                {/* SelectorDropdown */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDbDropdown(!showDbDropdown)}
                    disabled={isGenerating}
                    className="bg-[#F4F1E9]/80 border border-border/80 text-muted-foreground text-[10px] font-bold rounded-full pl-3 pr-2.5 py-1 outline-none cursor-pointer h-8 flex items-center gap-1.5 hover:bg-[#F4F1E9] transition-all select-none"
                  >
                    {/* Connection status indicator dot */}
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      !activeConnection ? "bg-neutral-300" :
                        connectionStatus === 'connected' ? "bg-emerald-500" :
                          connectionStatus === 'connecting' ? "bg-amber-500 animate-pulse" : "bg-neutral-300"
                    )} />
                    <span className="max-w-[80px] truncate">
                      {activeConnection?.name}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>

                  {showDbDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDbDropdown(false)}
                      />
                      <div className="absolute left-0 bottom-full mb-1.5 z-50 w-48 bg-card border border-border/80 rounded-2xl shadow-lg p-1.5 animate-fade-in space-y-0.5 select-none text-left">
                        <div
                          onClick={() => {
                            handleDatabaseChange('')
                            setShowDbDropdown(false)
                          }}
                          className={cn(
                            "px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer hover:bg-muted/40 transition-all flex items-center gap-2",
                            !activeConnection ? "text-primary bg-[#FBE4DC]" : "text-muted-foreground"
                          )}
                        >

                        </div>
                        {savedConnections.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              handleDatabaseChange(c.id)
                              setShowDbDropdown(false)
                            }}
                            className={cn(
                              "px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer hover:bg-muted/40 transition-all flex items-center gap-2",
                              activeConnection?.id === c.id ? "text-primary bg-[#FBE4DC]" : "text-muted-foreground"
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">{c.name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
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

      {/* Destructive Query Warning Modal overlay */}
      {destructiveQueryToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm select-none p-4">
          <div className="bg-card border border-border/80 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 animate-fade-in text-left">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              ⚠️ Destructive Query Warning
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The query you are about to execute contains a destructive command (<span className="font-bold text-primary">DROP/DELETE/TRUNCATE</span>). Executing this might permanently alter or lose your database tables and data.
            </p>

            <div className="code-card p-3 rounded-lg border border-border/40 max-h-36 overflow-y-auto text-[10px] font-mono leading-relaxed bg-[#F4F1E9] text-[#3A3A3A]">
              <code>{destructiveQueryToConfirm.sql}</code>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDestructiveQueryToConfirm(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const { msgId, sql } = destructiveQueryToConfirm
                  setDestructiveQueryToConfirm(null)
                  await runExecution(msgId, sql)
                }}
                className="px-4 py-2 rounded-xl bg-destructive text-white hover:bg-destructive/95 text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Execute Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No database connections hard block popup */}
      {savedConnections.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 select-none animate-fade-in">
          <div className="bg-card border border-border/80 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-5 animate-scale-up">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Database className="h-6 w-6 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground">
                No Database Connected
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                To start chatting with SpeakDB and writing queries, you need to add a database connection first.
              </p>
            </div>
            
            <div className="pt-2">
              <button
                onClick={() => navigate('/connections')}
                className="w-full py-2.5 rounded-xl bg-primary text-white hover:bg-primary/95 text-xs font-semibold shadow-md shadow-primary/10 transition-all cursor-pointer"
              >
                Configure Database Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat
