import React from 'react'
import {
  DatabaseZap,
  GitBranch,
  BookOpen,
  Cpu,
  Info,
  LifeBuoy
} from 'lucide-react'

const About: React.FC = () => {
  return (
    <div className="space-y-8 max-w-3xl animate-fade-in select-none">
      
      {/* Brand panel */}
      <div className="rounded-2xl border border-border/70 bg-card/25 p-8 flex flex-col items-center text-center space-y-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <DatabaseZap className="h-8 w-8" />
        </div>
        
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            SpeakDB
          </h2>
          <p className="text-xs text-muted-foreground">Version 1.0.0 (Production Release Build)</p>
        </div>

        <p className="text-xs text-neutral-300 max-w-md leading-relaxed">
          An AI-powered desktop client built for database exploration using natural language. SpeakDB interprets conversational prompts, compiles optimized SQL queries, and streams execution results securely.
        </p>

        <div className="flex gap-3 pt-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-muted border border-border px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 transition-all"
          >
            <GitBranch className="h-4 w-4" />
            <span>GitHub Repository</span>
          </a>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-all"
          >
            <LifeBuoy className="h-4 w-4" />
            <span>Developer Guide</span>
          </button>
        </div>
      </div>

      {/* Tutorial guides */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-4.5 w-4.5 text-primary" />
          <span>Quick Setup Guide</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/60 bg-card/20 p-5 space-y-2">
            <span className="text-[10px] bg-primary/15 text-primary font-bold px-2 py-0.5 rounded-full">STEP 1</span>
            <h4 className="text-xs font-bold text-foreground">Attach Database</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Navigate to <b>Connections</b>. Create an instance for PostgreSQL, MySQL, SQL Server, or select a local SQLite file.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/20 p-5 space-y-2">
            <span className="text-[10px] bg-primary/15 text-primary font-bold px-2 py-0.5 rounded-full">STEP 2</span>
            <h4 className="text-xs font-bold text-foreground">Setup AI Model</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              In <b>Settings</b>, choose between local execution using Ollama (default) or cloud access via OpenRouter, OpenAI, or Gemini.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/20 p-5 space-y-2">
            <span className="text-[10px] bg-primary/15 text-primary font-bold px-2 py-0.5 rounded-full">STEP 3</span>
            <h4 className="text-xs font-bold text-foreground">Conversational Chat</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Enter <b>AI Chat</b>. Ask queries in natural language, review generated SQL statements, and execute commands safely.
            </p>
          </div>
        </div>
      </div>

      {/* Technologies stack listing */}
      <div className="rounded-xl border border-border/60 bg-card/20 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <Cpu className="h-4.5 w-4.5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">System Specifications & Architecture Stack</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-background/50 border border-border/40 rounded-lg">
            <h5 className="text-[10px] text-muted-foreground font-bold uppercase">Runtime</h5>
            <p className="text-xs font-bold text-foreground mt-1">Electron v39.2</p>
          </div>
          <div className="p-3 bg-background/50 border border-border/40 rounded-lg">
            <h5 className="text-[10px] text-muted-foreground font-bold uppercase">UI Library</h5>
            <p className="text-xs font-bold text-foreground mt-1">React v19.2</p>
          </div>
          <div className="p-3 bg-background/50 border border-border/40 rounded-lg">
            <h5 className="text-[10px] text-muted-foreground font-bold uppercase">State Manager</h5>
            <p className="text-xs font-bold text-foreground mt-1">Zustand v4.5</p>
          </div>
          <div className="p-3 bg-background/50 border border-border/40 rounded-lg">
            <h5 className="text-[10px] text-muted-foreground font-bold uppercase">Bundler</h5>
            <p className="text-xs font-bold text-foreground mt-1">Vite v7.2</p>
          </div>
        </div>
      </div>

      {/* Credits block */}
      <div className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
        <Info className="h-3.5 w-3.5" />
        <span>SpeakDB is licensed under the MIT Open Source License agreements.</span>
      </div>

    </div>
  )
}

export default About
