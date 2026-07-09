import { AIModelConfig, AISqlResponse, ChatMessage } from '../../renderer/src/services/ai/types'
import { DatabaseSchema } from '../../renderer/src/services/db/types'

// Load OpenRouter API Key from environment variables
const OPENROUTER_API_KEY: string = process.env.OPENROUTER_API_KEY || ''

// Schema compression helper to reduce token size and fit schema inside token limits
function compressSchema(schema: DatabaseSchema | null): string {
  if (!schema || !schema.tables || schema.tables.length === 0) return 'No tables found in public schema.'
  
  return schema.tables.map(table => {
    const cols = table.columns.map(col => {
      let type = col.dataType.toLowerCase()
      // Simplify common SQL types to reduce text footprint
      if (type.includes('character varying')) type = 'varchar'
      else if (type.includes('timestamp')) type = 'timestamp'
      else if (type.includes('integer')) type = 'int'
      else if (type.includes('decimal') || type.includes('numeric')) type = 'dec'
      
      const constraint = col.isPrimaryKey 
        ? 'pk' 
        : col.isForeignKey && col.referencedTable 
        ? `fk->${col.referencedTable}.${col.referencedColumn}` 
        : ''
      
      return `${col.name} ${type}${constraint ? ' ' + constraint : ''}${col.isNullable ? ' null' : ''}`.trim()
    }).join(',')
    
    return `${table.name}(${cols})`
  }).join('; ')
}

export class AIManager {
  private verifyAPIKey(config: AIModelConfig) {
    if (config.provider === 'ollama') return
    const key = OPENROUTER_API_KEY || config.apiKey || ''
    if (!key) {
      throw new Error('AI API Key is missing. Please add it to your .env file or add it in Settings.')
    }
  }

  private getHeaders(config: AIModelConfig) {
    const key = OPENROUTER_API_KEY || config.apiKey || ''
    return {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'SpeakDB'
    }
  }

  /**
   * Generates a valid SQL statement based on prompt and compressed schema context
   */
  public async generateSQL(
    prompt: string,
    schema: DatabaseSchema,
    config: AIModelConfig
  ): Promise<AISqlResponse> {
    this.verifyAPIKey(config)

    const compressed = compressSchema(schema)
    const systemPrompt = `You are a PostgreSQL expert writing SQL queries for a database with this schema:
${compressed}

Translate the user's natural language request into a clean, valid SQL query. 
Return ONLY a valid JSON object matching this structure:
{
  "sql": "SELECT ...",
  "explanation": "Brief explanation of what the query does"
}
Do not include markdown blocks, code formatting, or other text outside the JSON object.`

    const url = config.provider === 'ollama' 
      ? (config.endpointUrl || 'http://localhost:11434/api/chat') 
      : 'https://openrouter.ai/api/v1/chat/completions'
      
    const model = config.modelName || 'poolside/laguna-xs-2.1:free'

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(config),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenRouter API call failed: ${res.statusText} (${errText})`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    try {
      const parsed = JSON.parse(content.trim())
      return {
        sql: parsed.sql || '',
        explanation: parsed.explanation || '',
        confidenceScore: 90
      }
    } catch (_) {
      // Fallback: extract SQL if LLM returned wrapped response
      const sqlMatch = content.match(/```sql([\s\S]*?)```/) || content.match(/```([\s\S]*?)```/)
      const sql = sqlMatch ? sqlMatch[1].trim() : content.trim()
      return {
        sql,
        explanation: 'Generated SQL based on request.',
        confidenceScore: 70
      }
    }
  }

  /**
   * Explains an SQL statement in plain English
   */
  public async explainSQL(
    sql: string,
    schema: DatabaseSchema | null,
    config: AIModelConfig
  ): Promise<string> {
    this.verifyAPIKey(config)

    const compressed = compressSchema(schema)
    const systemPrompt = `Explain this SQL query in plain English for a database with this schema:
${compressed}`

    const url = 'https://openrouter.ai/api/v1/chat/completions'
    const model = config.modelName || 'meta-llama/llama-3-70b-instruct'

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(config),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Explain this SQL query: ${sql}` }
        ]
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenRouter explain failed: ${res.statusText} (${errText})`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || 'Could not generate explanation.'
  }

  /**
   * Suggest optimizations for queries
   */
  public async optimizeSQL(
    sql: string,
    schema: DatabaseSchema | null,
    config: AIModelConfig
  ): Promise<{ optimizedSql: string; explanation: string }> {
    this.verifyAPIKey(config)

    const compressed = compressSchema(schema)
    const systemPrompt = `Optimize this SQL query for a database with this schema:
${compressed}

Return a valid JSON object:
{
  "optimizedSql": "...",
  "explanation": "..."
}`

    const url = 'https://openrouter.ai/api/v1/chat/completions'
    const model = config.modelName || 'meta-llama/llama-3-70b-instruct'

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(config),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Optimize this SQL query: ${sql}` }
        ],
        response_format: { type: 'json_object' }
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenRouter optimize failed: ${res.statusText} (${errText})`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    try {
      const parsed = JSON.parse(content.trim())
      return {
        optimizedSql: parsed.optimizedSql || sql,
        explanation: parsed.explanation || 'No optimization suggested.'
      }
    } catch (_) {
      return {
        optimizedSql: sql,
        explanation: content
      }
    }
  }

  /**
   * Conversational natural language handler
   */
  public async chat(
    history: ChatMessage[],
    schema: DatabaseSchema | null,
    config: AIModelConfig
  ): Promise<string> {
    this.verifyAPIKey(config)

    const compressed = compressSchema(schema)
    const systemPrompt = `You are a helpful database AI assistant. The current database schema is:
${compressed}

Answer user questions about the database catalog or SQL. Be concise.`

    const url = 'https://openrouter.ai/api/v1/chat/completions'
    const model = config.modelName || 'meta-llama/llama-3-70b-instruct'

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(config),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map(m => ({ role: m.role, content: m.content }))
        ]
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenRouter chat failed: ${res.statusText} (${errText})`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }
}

export const aiManager = new AIManager()
