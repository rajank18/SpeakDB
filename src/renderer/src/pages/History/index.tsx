import React from 'react'
import {
  History as HistoryIcon,
  Search,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Database
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface HistoryItem {
  id: string
  connectionName: string
  connectionType: string
  sql: string
  executionTimeMs: number
  status: 'success' | 'error'
  errorMessage?: string
  rowsCount?: number
  timestamp: string
}

const History: React.FC = () => {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'success' | 'error'>('all')

  // Mock query history items
  const historyItems: HistoryItem[] = [
    {
      id: '1',
      connectionName: 'Postgres Production',
      connectionType: 'postgres',
      sql: 'SELECT id, name, email FROM users WHERE status = \'active\' LIMIT 100;',
      executionTimeMs: 14,
      status: 'success',
      rowsCount: 48,
      timestamp: '2026-07-08T13:45:00Z'
    },
    {
      id: '2',
      connectionName: 'SQLite Local Test',
      connectionType: 'sqlite',
      sql: 'INSERT INTO products (sku, title, price, stock) VALUES (\'PROD-902\', \'Premium Adapter\', 24.99, 150);',
      executionTimeMs: 5,
      status: 'success',
      timestamp: '2026-07-08T12:30:00Z'
    },
    {
      id: '3',
      connectionName: 'Postgres Production',
      connectionType: 'postgres',
      sql: 'SELECT SUM(amount) FROM payments WHERE transaction_date = \'2026-08-01\';',
      executionTimeMs: 35,
      status: 'error',
      errorMessage: 'Relation "payments" does not exist. Did you mean "transactions"?',
      timestamp: '2026-07-08T11:15:00Z'
    },
    {
      id: '4',
      connectionName: 'MySQL Web Staging',
      connectionType: 'mysql',
      sql: 'SELECT o.id, o.total_amount, u.name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 5;',
      executionTimeMs: 22,
      status: 'success',
      rowsCount: 5,
      timestamp: '2026-07-07T18:22:00Z'
    }
  ]

  const handleCopy = (sql: string) => {
    navigator.clipboard.writeText(sql)
    alert('SQL query copied to clipboard!')
  }

  const filteredItems = historyItems.filter((item) => {
    const matchesSearch = item.sql.toLowerCase().includes(search.toLowerCase()) ||
      item.connectionName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* Header and status filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-primary" />
            <span>Query History Log</span>
          </h2>
          <p className="text-xs text-muted-foreground">Audit logs of all natural language generations and SQL query executions.</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search SQL query..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-card/40 border border-border/80 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary/50 text-foreground transition-all w-48"
            />
          </div>
          <div className="flex bg-muted/40 rounded-lg p-0.5 border border-border/50 text-xs font-semibold text-muted-foreground">
            {(['all', 'success', 'error'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setStatusFilter(type)}
                className={cn(
                  "px-2.5 py-1 rounded-lg capitalize transition-all",
                  statusFilter === type
                    ? "bg-card text-foreground shadow"
                    : "hover:text-foreground"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History Items Log */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <HistoryIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h4 className="text-xs font-bold mb-1">No Query Logs Found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Your executed SQL logs will appear here once you query your databases.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-xl border bg-card/10 overflow-hidden flex flex-col justify-between hover:border-border transition-all",
                item.status === 'error' ? "border-destructive/30" : "border-border/60"
              )}
            >
              {/* Top Meta info */}
              <div className="bg-card/30 border-b border-border/40 px-4 py-2.5 flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                <div className="flex items-center gap-2">
                  {item.status === 'success' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span className={item.status === 'success' ? "text-emerald-400" : "text-destructive"}>
                    {item.status.toUpperCase()}
                  </span>
                  <span className="text-muted-foreground/40 font-normal">|</span>
                  <div className="flex items-center gap-1 font-semibold">
                    <Database className="h-3 w-3" />
                    <span className="uppercase text-foreground">{item.connectionType}</span>
                    <span className="text-muted-foreground">({item.connectionName})</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.rowsCount !== undefined && (
                    <span>Rows: {item.rowsCount}</span>
                  )}
                  <span>Time: {item.executionTimeMs}ms</span>
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {/* SQL content */}
              <div className="p-4 relative group">
                <pre className="overflow-x-auto text-[11px] font-semibold text-neutral-300 font-mono pr-12 leading-relaxed">
                  <code>{item.sql}</code>
                </pre>

                <div className="absolute right-4 top-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(item.sql)}
                    className="p-1.5 rounded bg-muted/80 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    title="Copy Query"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="p-1.5 rounded bg-muted/80 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    title="Open in Chat"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Errors footer */}
              {item.status === 'error' && item.errorMessage && (
                <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 text-[11px] text-destructive font-mono font-medium leading-relaxed">
                  ERROR: {item.errorMessage}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default History
