import { create } from 'zustand'

export type AIProviderType = 'openrouter' | 'ollama' | 'openai' | 'gemini'

export interface SettingsState {
  aiProvider: AIProviderType
  openRouterKey: string
  openAIKey: string
  geminiKey: string
  ollamaUrl: string
  selectedModel: string
  theme: 'dark' | 'light'
  safeMode: boolean // Require approval before executing DDL/DML queries
  maxRows: number
  
  setAIProvider: (provider: AIProviderType) => void
  setAPIKey: (provider: Exclude<AIProviderType, 'ollama'>, key: string) => void
  setOllamaUrl: (url: string) => void
  setSelectedModel: (model: string) => void
  setTheme: (theme: 'dark' | 'light') => void
  setSafeMode: (safe: boolean) => void
  setMaxRows: (rows: number) => void
}

const DEFAULT_MODELS: Record<AIProviderType, string> = {
  openrouter: 'poolside/laguna-xs-2.1:free',
  ollama: 'llama3',
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro'
}

export const useSettingsStore = create<SettingsState>((set) => ({
  aiProvider: 'openrouter',
  openRouterKey: '',
  openAIKey: '',
  geminiKey: '',
  ollamaUrl: 'http://localhost:11434',
  selectedModel: 'poolside/laguna-xs-2.1:free',
  theme: 'dark',
  safeMode: true,
  maxRows: 100,

  setAIProvider: (provider) =>
    set(() => ({
      aiProvider: provider,
      selectedModel: DEFAULT_MODELS[provider]
    })),

  setAPIKey: (provider, key) =>
    set(() => {
      const field = provider === 'openrouter'
        ? 'openRouterKey'
        : provider === 'openai'
        ? 'openAIKey'
        : 'geminiKey'
      return { [field]: key }
    }),

  setOllamaUrl: (url) => set({ ollamaUrl: url }),
  
  setSelectedModel: (model) => set({ selectedModel: model }),
  
  setTheme: (theme) => set({ theme }),
  
  setSafeMode: (safe) => set({ safeMode: safe }),
  
  setMaxRows: (rows) => set({ maxRows: rows })
}))
