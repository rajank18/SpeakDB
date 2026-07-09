import React from 'react'
import { Link } from 'react-router-dom'
import {
  Database,
  Terminal,
  Link2,
  Cpu,
  ArrowRight,
  TrendingUp,
  MessageSquarePlus,
  Compass
} from 'lucide-react'
import { useConnectionStore } from '../../store/connectionStore'
import { useChatStore } from '../../store/chatStore'

const Dashboard: React.FC = () => {
  const { activeConnection } = useConnectionStore()
  const { createThread } = useChatStore()

  // Mock dashboard stats
  const stats = [
    {
      label: 'Database Size',
      value: activeConnection ? '1.2 GB' : '--',
      icon: Database,
      change: '+4.2% this week',
      color: 'text-blue-500'
    },
    {
      label: 'Tables Discovered',
      value: activeConnection ? '24' : '--',
      icon: Compass,
      change: 'Fully cached',
      color: 'text-indigo-500'
    },
    {
      label: 'LLM CPU/GPU usage',
      value: '22%',
      icon: Cpu,
      change: 'Local Ollama online',
      color: 'text-purple-500'
    },
    {
      label: 'SQL Queries Generated',
      value: '148',
      icon: Terminal,
      change: '98% execution success',
      color: 'text-emerald-500'
    }
  ]

  // Mock queries history for Dashboard
  const recentQueries = [
    {
      id: 1,
      prompt: 'Get users with orders in last 30 days',
      sql: 'SELECT u.id, u.name, COUNT(o.id) as orders_count \nFROM users u \nJOIN orders o ON u.id = o.user_id \nWHERE o.created_at >= NOW() - INTERVAL \'30 days\' \nGROUP BY u.id \nHAVING COUNT(o.id) > 0;',
      time: '14ms',
      status: 'success'
    },
    {
      id: 2,
      prompt: 'Calculate total revenue for active products',
      sql: 'SELECT SUM(o.total_amount) as revenue \nFROM orders o \nJOIN order_items oi ON o.id = oi.order_id \nJOIN products p ON oi.product_id = p.id \nWHERE p.status = \'active\';',
      time: '28ms',
      status: 'success'
    }
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden glass-panel p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="space-y-2 z-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            {activeConnection ? `Active Database: ${activeConnection.name}` : 'Welcome to SpeakDB'}
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl">
            {activeConnection
              ? `You are connected to ${activeConnection.database} (${activeConnection.type.toUpperCase()}). Chat with your database in plain English or explore the catalog.`
              : 'Connect to PostgreSQL, MySQL, SQLite, or SQL Server to start generating queries, explaining code, and chatting with your database in natural language.'}
          </p>
        </div>
        <div className="flex gap-3 z-10">
          {activeConnection ? (
            <Link
              to="/chat"
              onClick={() => createThread()}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/95 transition-all"
            >
              <MessageSquarePlus className="h-4.5 w-4.5" />
              <span>Ask AI Chat</span>
            </Link>
          ) : (
            <Link
              to="/connections"
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/95 transition-all"
            >
              <Link2 className="h-4.5 w-4.5" />
              <span>Setup Connection</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="rounded-xl border border-border/60 bg-card/30 p-6 flex flex-col justify-between hover:border-border transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="mt-4 space-y-1">
                <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <span>{stat.change}</span>
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Visual Analytics & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mock Analytics Chart */}
        <div className="rounded-xl border border-border/60 bg-card/20 p-6 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-foreground">Query Activity</h3>
              <p className="text-xs text-muted-foreground">Volume of AI-generated queries executed</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/40 rounded-lg p-1">
              <span className="bg-card px-2 py-0.5 rounded shadow text-foreground">7 Days</span>
              <span className="px-2 py-0.5">30 Days</span>
            </div>
          </div>
          {/* Custom CSS Chart for layout visuals */}
          <div className="h-48 flex items-end gap-3 pt-6 border-b border-border/50">
            {[45, 80, 55, 120, 95, 140, 110].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                <div 
                  style={{ height: `${(val / 150) * 100}%` }}
                  className="w-full bg-gradient-to-t from-primary/40 to-primary rounded-t-md relative hover:from-primary/60 hover:to-primary/90 transition-all duration-300"
                >
                  {/* Tooltip */}
                  <div className="absolute top-[-28px] left-1/2 -translate-x-1/2 bg-card border border-border px-1.5 py-0.5 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity font-bold whitespace-nowrap z-50">
                    {val} Qs
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* System Monitor Status */}
        <div className="rounded-xl border border-border/60 bg-card/20 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-foreground">System Health</h3>
              <p className="text-xs text-muted-foreground">Connected LLM and Client logs</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/30 text-xs">
                <span className="text-muted-foreground">Local Ollama Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/30 text-xs">
                <span className="text-muted-foreground">Active Connection Type</span>
                <span className="text-foreground font-semibold uppercase">{activeConnection ? activeConnection.type : 'None'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/30 text-xs">
                <span className="text-muted-foreground">IPC Channel Status</span>
                <span className="text-emerald-400 font-semibold">Ready</span>
              </div>
            </div>
          </div>
          <Link
            to="/settings"
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 mt-4"
          >
            <span>Manage Model Configurations</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Recent Queries Snippets */}
      <div className="rounded-xl border border-border/60 bg-card/20 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Recent SQL Execution Snippets</h3>
          <p className="text-xs text-muted-foreground">Click copy or open directly in SQL editor</p>
        </div>
        <div className="space-y-4">
          {recentQueries.map((q) => (
            <div key={q.id} className="border border-border/40 bg-background/40 rounded-xl overflow-hidden">
              <div className="bg-card/40 border-b border-border/40 px-4 py-2 flex justify-between items-center text-xs">
                <span className="font-semibold text-muted-foreground">Prompt: &quot;{q.prompt}&quot;</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20">{q.time}</span>
                  <span className="text-muted-foreground text-[10px]">SUCCESS</span>
                </div>
              </div>
              <pre className="p-4 overflow-x-auto text-[11px] leading-relaxed text-indigo-200">
                <code>{q.sql}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
