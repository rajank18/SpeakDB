import { DatabaseSchema } from '../db/types'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AISqlResponse {
  sql: string
  explanation: string
  confidenceScore: number // 0 - 100
  potentialWarnings?: string[]
}

export interface AIModelConfig {
  provider: 'openrouter' | 'ollama' | 'openai' | 'gemini'
  apiKey?: string
  modelName: string
  endpointUrl?: string // For Ollama or custom local deployments
}

export interface IAiProvider {
  /**
   * Type identifier of the AI intelligence provider
   */
  readonly providerType: 'openrouter' | 'ollama' | 'openai' | 'gemini'

  /**
   * Generates a valid SQL statement based on a natural language prompt and the database schema context
   */
  generateSQL(
    prompt: string,
    schemaContext: DatabaseSchema,
    config: AIModelConfig
  ): Promise<AISqlResponse>

  /**
   * Explains an existing SQL query in plain English
   */
  explainSQL(
    sql: string,
    schemaContext: DatabaseSchema | null,
    config: AIModelConfig
  ): Promise<string>

  /**
   * Analyzes a query and returns suggestions for performance optimization
   */
  optimizeSQL(
    sql: string,
    schemaContext: DatabaseSchema | null,
    config: AIModelConfig
  ): Promise<{ optimizedSql: string; explanation: string }>

  /**
   * Converses in natural language about database concepts/data schemas
   */
  chat(
    history: ChatMessage[],
    schemaContext: DatabaseSchema | null,
    config: AIModelConfig
  ): Promise<string>
}
