import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  executionTimeMs: number
  error?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  sql?: string // If AI generated SQL
  queryResult?: QueryResult // If SQL was executed
  isError?: boolean
}

export interface ChatThread {
  id: string
  title: string
  createdAt: string
  messages: Message[]
}

interface ChatState {
  threads: ChatThread[]
  activeThreadId: string | null
  isGenerating: boolean
  createThread: (title?: string) => string
  deleteThread: (id: string) => void
  setActiveThreadId: (id: string | null) => void
  addMessage: (threadId: string, message: Omit<Message, 'id' | 'timestamp'>) => void
  updateMessage: (threadId: string, messageId: string, updates: Partial<Message>) => void
  clearThreadMessages: (threadId: string) => void
  setIsGenerating: (generating: boolean) => void
  renameThread: (id: string, title: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      threads: [],
      activeThreadId: null,
      isGenerating: false,

      createThread: (title = 'New Conversation') => {
        const id = crypto.randomUUID()
        set((state) => ({
          threads: [
            {
              id,
              title,
              createdAt: new Date().toISOString(),
              messages: []
            },
            ...state.threads
          ],
          activeThreadId: id
        }))
        return id
      },

      deleteThread: (id) =>
        set((state) => {
          const remaining = state.threads.filter((t) => t.id !== id)
          let nextActive = state.activeThreadId
          if (state.activeThreadId === id) {
            nextActive = remaining.length > 0 ? remaining[0].id : null
          }
          return {
            threads: remaining,
            activeThreadId: nextActive
          }
        }),

      setActiveThreadId: (id) => set({ activeThreadId: id }),

      addMessage: (threadId, message) =>
        set((state) => {
          const newMessage: Message = {
            ...message,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString()
          }
          
          const updatedThreads = state.threads.map((t) => {
            if (t.id === threadId) {
              // If this is the first message from the user, update title to message content (truncated)
              const newTitle = t.messages.length === 0 && message.role === 'user'
                ? message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
                : t.title
              
              return {
                ...t,
                title: newTitle,
                messages: [...t.messages, newMessage]
              }
            }
            return t
          })

          return { threads: updatedThreads }
        }),

      updateMessage: (threadId, messageId, updates) =>
        set((state) => ({
          threads: state.threads.map((t) => {
            if (t.id === threadId) {
              return {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === messageId ? { ...m, ...updates } : m
                )
              }
            }
            return t
          })
        })),

      clearThreadMessages: (threadId) =>
        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === threadId ? { ...t, messages: [] } : t
          )
        })),

      setIsGenerating: (generating) => set({ isGenerating: generating }),

      renameThread: (id, title) =>
        set((state) => ({
          threads: state.threads.map((t) => (t.id === id ? { ...t, title } : t))
        }))
    }),
    {
      name: 'speakdb-chats'
    }
  )
)
