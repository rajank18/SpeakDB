import React from 'react'
import {
  Link2,
  Database,
  Plus,
  Trash2,
  CheckCircle,
  Server,
  FolderOpen,
  Eye,
  EyeOff
} from 'lucide-react'
import { useConnectionStore, DBConnection } from '../../store/connectionStore'
import { cn } from '../../lib/utils'

const Connections: React.FC = () => {
  const {
    activeConnection,
    savedConnections,
    connectionStatus,
    setActiveConnection,
    setConnectionStatus,
    addConnection,
    removeConnection
  } = useConnectionStore()

  // Form states
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [dbType, setDbType] = React.useState<'postgres' | 'mysql' | 'sqlite' | 'mssql'>('postgres')
  const [name, setName] = React.useState('')
  const [host, setHost] = React.useState('localhost')
  const [port, setPort] = React.useState(5432)
  const [database, setDatabase] = React.useState('')
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [filepath, setFilepath] = React.useState('')
  const [ssl, setSsl] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  // Adjust default ports when DB type changes
  React.useEffect(() => {
    if (dbType === 'postgres') setPort(5432)
    else if (dbType === 'mysql') setPort(3306)
    else if (dbType === 'mssql') setPort(1433)
  }, [dbType])

  const handleCreateConnection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || (dbType !== 'sqlite' && !database)) return

    addConnection({
      name,
      type: dbType,
      host: dbType !== 'sqlite' ? host : undefined,
      port: dbType !== 'sqlite' ? port : undefined,
      database: dbType === 'sqlite' ? 'sqlite.db' : database,
      username: dbType !== 'sqlite' ? username : undefined,
      password: dbType !== 'sqlite' ? password : undefined,
      filepath: dbType === 'sqlite' ? filepath : undefined,
      ssl: dbType !== 'sqlite' ? ssl : undefined
    })

    // Reset Form
    setName('')
    setDatabase('')
    setUsername('')
    setPassword('')
    setFilepath('')
    setShowAddForm(false)
  }

  const handleConnect = async (conn: DBConnection) => {
    setConnectionStatus('connecting')
    try {
      const success = await window.electron.ipcRenderer.invoke('db:connect', conn)
      if (success) {
        setActiveConnection(conn)
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('error', 'Failed to connect. Make sure credentials are correct.')
      }
    } catch (e: any) {
      setConnectionStatus('error', e.message || String(e))
    }
  }

  const handleDisconnect = async () => {
    try {
      await window.electron.ipcRenderer.invoke('db:disconnect')
    } catch (err) {
      console.error('Error disconnecting database:', err)
    }
    setActiveConnection(null)
    setConnectionStatus('disconnected')
  }

  const dbProviders = [
    { type: 'postgres', name: 'PostgreSQL', icon: Database, color: 'text-indigo-400', desc: 'Powerful SQL relational database' },
    { type: 'mysql', name: 'MySQL / MariaDB', icon: Server, color: 'text-blue-400', desc: 'Popular open-source web database' },
    { type: 'sqlite', name: 'SQLite', icon: Database, color: 'text-emerald-400', desc: 'Local, embedded zero-config database' },
    { type: 'mssql', name: 'Microsoft SQL Server', icon: Server, color: 'text-red-400', desc: 'Enterprise relational SQL server' }
  ] as const

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner and status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Database Connections</h2>
          <p className="text-xs text-muted-foreground">Manage connections to your local or cloud SQL instances.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>{showAddForm ? 'Hide Form' : 'New Connection'}</span>
        </button>
      </div>

      {/* Connection Form Panel */}
      {showAddForm && (
        <div className="rounded-xl border border-border/70 bg-card/25 p-6 animate-fade-in max-w-2xl select-none">
          <h3 className="text-sm font-bold text-foreground mb-4">Add Database Connection Credentials</h3>
          <form onSubmit={handleCreateConnection} className="space-y-4">
            
            {/* DB Type Picker */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {dbProviders.map((p) => {
                const Icon = p.icon
                return (
                  <div
                    key={p.type}
                    onClick={() => setDbType(p.type)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 cursor-pointer text-center transition-all",
                      dbType === p.type
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/60 bg-background/20 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-6 w-6", p.color)} />
                    <span className="text-[11px] font-bold">{p.name}</span>
                  </div>
                )
              })}
            </div>

            {/* Fields container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Connection Nickname *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production PostgreSQL, Dev DB"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 text-foreground transition-all"
                />
              </div>

              {dbType !== 'sqlite' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Database Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ecommerce_db"
                      value={database}
                      onChange={(e) => setDatabase(e.target.value)}
                      className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 text-foreground transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Host / Server IP *</label>
                    <input
                      type="text"
                      required
                      placeholder="localhost or IP address"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 text-foreground transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Port *</label>
                    <input
                      type="number"
                      required
                      value={port}
                      onChange={(e) => setPort(Number(e.target.value))}
                      className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 text-foreground transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Username</label>
                    <input
                      type="text"
                      placeholder="e.g. postgres"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 text-foreground transition-all"
                    />
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-background border border-border/80 rounded-lg pl-3 pr-10 py-2 text-xs outline-none focus:border-primary/50 text-foreground transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="ssl-conn"
                      checked={ssl}
                      onChange={(e) => setSsl(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="ssl-conn" className="text-xs text-muted-foreground cursor-pointer font-medium">Require SSL Encrypted Connection</label>
                  </div>
                </>
              ) : (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">SQLite Database File Path *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="C:/users/name/db.sqlite"
                      value={filepath}
                      onChange={(e) => setFilepath(e.target.value)}
                      className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 text-foreground transition-all"
                    />
                    <button
                      type="button"
                      className="bg-muted text-foreground border border-border px-3 py-1 text-xs rounded-lg font-semibold flex items-center gap-1.5 hover:bg-muted/80 transition-all"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Browse
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-muted text-foreground border border-border px-4 py-2 text-xs rounded-xl font-semibold hover:bg-muted/80 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-4 py-2 text-xs rounded-xl font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
              >
                Save Connection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connection State banner */}
      {connectionStatus === 'connected' && activeConnection && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Active connection established</h4>
              <p className="text-[11px] text-muted-foreground">Connected to database &quot;{activeConnection.database}&quot; on {activeConnection.name}. Schema cache refreshed.</p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-all self-start sm:self-auto"
          >
            Disconnect Link
          </button>
        </div>
      )}

      {connectionStatus === 'connecting' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3 select-none">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
          <span className="text-xs text-amber-400 font-semibold tracking-wide uppercase">Connecting... validating connection credentials and building schema catalog...</span>
        </div>
      )}

      {/* Saved Connections List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground select-none">Saved Connection List</h3>
        {savedConnections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center select-none">
            <Link2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h4 className="text-xs font-bold mb-1">No Saved Connections</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              Create a database connection to allow SpeakDB to run queries, analyze tables, and support natural language search.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs text-primary font-bold hover:underline"
            >
              Add your first connection credentials
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
            {savedConnections.map((conn) => {
              const active = activeConnection?.id === conn.id
              const provider = dbProviders.find((p) => p.type === conn.type)
              const Icon = provider?.icon || Database
              return (
                <div
                  key={conn.id}
                  className={cn(
                    "rounded-xl border p-5 flex justify-between items-start transition-all relative overflow-hidden",
                    active
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border/60 bg-card/20 hover:border-border"
                  )}
                >
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-5 w-5", provider?.color || 'text-primary')} />
                      <h4 className="text-xs font-bold text-foreground truncate">{conn.name}</h4>
                      {active && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Active</span>
                      )}
                    </div>
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <p className="truncate">Type: <span className="text-foreground capitalize">{conn.type}</span></p>
                      {conn.type !== 'sqlite' ? (
                        <>
                          <p className="truncate">Host: <span className="text-foreground">{conn.host}:{conn.port}</span></p>
                          <p className="truncate">DB: <span className="text-foreground">{conn.database}</span></p>
                        </>
                      ) : (
                        <p className="truncate">Path: <span className="text-foreground">{conn.filepath}</span></p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0 items-end ml-4">
                    <button
                      onClick={() => removeConnection(conn.id)}
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {!active && (
                      <button
                        onClick={() => handleConnect(conn)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all mt-4"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Connections
