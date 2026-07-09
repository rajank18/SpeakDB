import React from 'react'
import {
  Settings as SettingsIcon,
  Sparkles,
  ShieldAlert,
  Save,
  Check,
  Eye,
  EyeOff,
  Info
} from 'lucide-react'
import { useSettingsStore, AIProviderType } from '../../store/settingsStore'
import { cn } from '../../lib/utils'

const Settings: React.FC = () => {
  const settings = useSettingsStore()

  // Local form states to avoid writing to store on every keystroke
  const [aiProvider, setAiProvider] = React.useState<AIProviderType>(settings.aiProvider)
  const [openRouterKey, setOpenRouterKey] = React.useState(settings.openRouterKey)
  const [openAIKey, setOpenAIKey] = React.useState(settings.openAIKey)
  const [geminiKey, setGeminiKey] = React.useState(settings.geminiKey)
  const [ollamaUrl, setOllamaUrl] = React.useState(settings.ollamaUrl)
  const [selectedModel, setSelectedModel] = React.useState(settings.selectedModel)
  const [safeMode, setSafeMode] = React.useState(settings.safeMode)
  const [maxRows, setMaxRows] = React.useState(settings.maxRows)

  const [showKeys, setShowKeys] = React.useState<Record<string, boolean>>({})
  const [savedSuccess, setSavedSuccess] = React.useState(false)

  // Sync state if store updates (e.g. from connection type actions)
  React.useEffect(() => {
    setSelectedModel(settings.selectedModel)
  }, [settings.selectedModel])

  const toggleShowKey = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    
    settings.setAIProvider(aiProvider)
    settings.setAPIKey('openrouter', openRouterKey)
    settings.setAPIKey('openai', openAIKey)
    settings.setAPIKey('gemini', geminiKey)
    settings.setOllamaUrl(ollamaUrl)
    settings.setSelectedModel(selectedModel)
    settings.setSafeMode(safeMode)
    settings.setMaxRows(maxRows)

    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2000)
  }

  const providersList = [
    { type: 'ollama', name: 'Ollama (Local LLM)', desc: 'Run model locally without cloud API keys' },
    { type: 'openrouter', name: 'OpenRouter', desc: 'Access 100+ open-source cloud models' },
    { type: 'openai', name: 'OpenAI (GPT-4o)', desc: 'Industry-standard developer APIs' },
    { type: 'gemini', name: 'Google Gemini', desc: 'DeepMind multimodal flagship model' }
  ] as const

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl animate-fade-in select-none">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <span>Application Settings</span>
          </h2>
          <p className="text-xs text-muted-foreground">Configure your AI model providers, API credentials, and query thresholds.</p>
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all"
        >
          {savedSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>{savedSuccess ? 'Settings Saved' : 'Save Changes'}</span>
        </button>
      </div>

      {/* AI Configurations Section */}
      <div className="rounded-xl border border-border/60 bg-card/20 p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">AI Intelligence & Model Providers</h3>
        </div>

        {/* Provider selector grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providersList.map((p) => (
            <div
              key={p.type}
              onClick={() => {
                setAiProvider(p.type)
                // Set default mock models
                if (p.type === 'ollama') setSelectedModel('llama3')
                else if (p.type === 'openrouter') setSelectedModel('meta-llama/llama-3-70b-instruct')
                else if (p.type === 'openai') setSelectedModel('gpt-4o')
                else if (p.type === 'gemini') setSelectedModel('gemini-1.5-pro')
              }}
              className={cn(
                "rounded-xl border p-4 cursor-pointer transition-all space-y-1 text-left relative overflow-hidden",
                aiProvider === p.type
                  ? "border-primary bg-primary/5"
                  : "border-border/60 bg-background/20 hover:border-border"
              )}
            >
              <h4 className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>{p.name}</span>
                {aiProvider === p.type && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </h4>
              <p className="text-[11px] text-muted-foreground leading-normal">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* API Credentials form fields depending on type */}
        <div className="space-y-4 pt-2">
          {aiProvider === 'ollama' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Ollama Endpoint URL</label>
              <input
                type="text"
                required
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 text-foreground transition-all"
              />
            </div>
          )}

          {aiProvider === 'openrouter' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">OpenRouter API Key</label>
              <div className="relative">
                <input
                  type={showKeys.openrouter ? 'text' : 'password'}
                  required
                  placeholder="sk-or-v1-..."
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-lg pl-3 pr-10 py-2 text-xs outline-none focus:border-primary/50 text-foreground transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('openrouter')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKeys.openrouter ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}

          {aiProvider === 'openai' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">OpenAI API Key</label>
              <div className="relative">
                <input
                  type={showKeys.openai ? 'text' : 'password'}
                  required
                  placeholder="sk-proj-..."
                  value={openAIKey}
                  onChange={(e) => setOpenAIKey(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-lg pl-3 pr-10 py-2 text-xs outline-none focus:border-primary/50 text-foreground transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('openai')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKeys.openai ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}

          {aiProvider === 'gemini' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Google AI API Key (Gemini)</label>
              <div className="relative">
                <input
                  type={showKeys.gemini ? 'text' : 'password'}
                  required
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-lg pl-3 pr-10 py-2 text-xs outline-none focus:border-primary/50 text-foreground transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('gemini')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKeys.gemini ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Model Selection Identifier</label>
            <input
              type="text"
              required
              placeholder="e.g. gpt-4o, llama3"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 text-foreground transition-all font-mono"
            />
            <p className="text-[10px] text-muted-foreground">Specify the exact tag/slug of the model you wish to query.</p>
          </div>
        </div>
      </div>

      {/* Safety & Execution preferences */}
      <div className="rounded-xl border border-border/60 bg-card/20 p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <ShieldAlert className="h-4.5 w-4.5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Safety Controls & Execution Safeguards</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="safe-mode" className="text-xs font-bold text-foreground cursor-pointer">Require approval before execution (Safe Mode)</label>
              <p className="text-[10px] text-muted-foreground">Always review generated DML/DDL statements (INSERT, UPDATE, DELETE) before running against active database connections.</p>
            </div>
            <input
              type="checkbox"
              id="safe-mode"
              checked={safeMode}
              onChange={(e) => setSafeMode(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border/30">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-foreground">Max Query Result Rows Limit</label>
              <span className="bg-muted px-2 py-0.5 rounded font-bold text-foreground">{maxRows} rows</span>
            </div>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={maxRows}
              onChange={(e) => setMaxRows(Number(e.target.value))}
              className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-[10px] text-muted-foreground">Limits rows loaded in frontend query viewports to prevent memory overflow during execution.</p>
          </div>
        </div>
      </div>

      {/* Security alert */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-foreground">Credential Storage Information</h4>
          <p className="text-[11px] text-muted-foreground leading-normal">
            SpeakDB stores API keys and endpoint credentials locally using secure main-process context configurations. Your database configurations and credentials are never transmitted to cloud servers.
          </p>
        </div>
      </div>
    </form>
  )
}

export default Settings
