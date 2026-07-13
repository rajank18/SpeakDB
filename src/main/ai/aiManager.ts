import { AIModelConfig, AISqlResponse, ChatMessage } from '../../renderer/src/services/ai/types'
import { DatabaseSchema } from '../../renderer/src/services/db/types'

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
    const key = process.env.OPENROUTER_API_KEY || config.apiKey || ''
    if (!key) {
      throw new Error('AI API Key is missing. Please add it to your .env file or add it in Settings.')
    }
  }

  private getHeaders(config: AIModelConfig) {
    const key = process.env.OPENROUTER_API_KEY || config.apiKey || ''
    return {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'SpeakDB'
    }
  }

  private isGreeting(text: string): boolean {
    const clean = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    const greetings = ['hello', 'hi', 'hey', 'greetings', 'hola', 'good morning', 'good afternoon', 'good evening', 'yo', 'sup', 'whats up'];
    return greetings.includes(clean);
  }

  private isOutOfScopeIdentityQuery(text: string): boolean {
    const clean = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    const identityKeywords = [
      'whats your name',
      'what is your name',
      'who are you',
      'who created you',
      'whats ur name',
      'what is ur name',
      'tell me a joke',
      'how are you',
      'how r you',
      'who is your creator',
      'what do you do'
    ];
    return identityKeywords.includes(clean);
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

    // Local greeting guardrail (fast response, zero token cost)
    if (this.isGreeting(prompt)) {
      return {
        sql: '',
        explanation: 'Hello! How can I assist you with your databases or SQL queries today?',
        confidenceScore: 100
      }
    }

    // Local out-of-scope identity query guardrail (fast response, zero token cost)
    if (this.isOutOfScopeIdentityQuery(prompt)) {
      return {
        sql: '',
        explanation: "Sorry, I can't assist with that.",
        confidenceScore: 100
      }
    }

    const compressed = compressSchema(schema)
    const systemPrompt = `You are a strict database expert assistant.
You are connected to a database with this schema:
${compressed}

Your absolute constraints are:
1. You can ONLY answer queries or perform tasks related to databases, writing SQL queries (PostgreSQL, SQLite, MariaDB, MySQL, SQL Server), or explaining SQL.
2. If the user's prompt is a greeting (e.g., "hello", "hi", "hey"), reply with a brief, friendly greeting in the "explanation" field and set the "sql" field to an empty string (""). Do NOT generate any SQL query.
3. If the user asks about anything else that is NOT related to database tables, queries, SQL syntax, or database administration, you MUST reply strictly and exactly with:
   "sql": "",
   "explanation": "Sorry, I can't assist with that."
4. Under no circumstances should you generate SQL or explain topics unrelated to database queries or schemas.

Few-Shot Examples:
Input: "hello"
Output: {"sql": "", "explanation": "Hello! How can I assist you with your database or SQL queries today?"}

Input: "what is your name?"
Output: {"sql": "", "explanation": "Sorry, I can't assist with that."}

Input: "whats ur name"
Output: {"sql": "", "explanation": "Sorry, I can't assist with that."}

Input: "write a python script to parse csv files"
Output: {"sql": "", "explanation": "Sorry, I can't assist with that."}

Input: "show all users that registered in the last 10 days"
Output: {"sql": "SELECT * FROM \\"users\\" WHERE registered_at >= NOW() - INTERVAL '10 days';", "explanation": "Selects users who registered in the last 10 days"}

Translate the request into the JSON structure:
{
  "sql": "SELECT ... or empty string",
  "explanation": "Explanation text or 'Sorry, I can't assist with that.'"
}`

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
      
      // If fallback contains greeting or out of scope content, apply safety filter
      if (this.isGreeting(sql) || sql.toLowerCase().includes("sorry, i can't assist")) {
        return {
          sql: '',
          explanation: this.isGreeting(sql)
            ? 'Hello! How can I assist you with your databases or SQL queries today?'
            : "Sorry, I can't assist with that.",
          confidenceScore: 100
        }
      }

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

  /**
   * Interprets database query results in natural language
   */
  public async interpretResults(
    question: string,
    sql: string,
    queryResult: any,
    config: AIModelConfig
  ): Promise<string> {
    this.verifyAPIKey(config)

    // Compress database results to save tokens:
    // 1. Limit rows (take max 25 rows)
    // 2. Map properties to compact pipe-separated string
    const columns = queryResult.columns || []
    const rows = (queryResult.rows || []).slice(0, 25)
    
    const headers = columns.join('|')
    const dataRows = rows.map((r: any) => 
      columns.map((c: string) => String(r[c] !== null && r[c] !== undefined ? r[c] : '')).join('|')
    ).join('\n')
    const compressedData = `${headers}\n${dataRows}`

    const systemPrompt = `You are a database analyst. The user asked a question and we executed an SQL query to get the answer.
User Question: "${question}"
Executed SQL: \`${sql}\`

Here are the database results (in compact pipe-separated format):
${compressedData}

Provide a concise, direct answer to the user's question in plain English based on the data. Do not refer to the table or column names unless necessary. Keep it simple, friendly, and non-technical.`

    const url = 'https://openrouter.ai/api/v1/chat/completions'
    const model = config.modelName || 'poolside/laguna-xs-2.1:free'

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(config),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt }
        ]
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenRouter interpretation failed: ${res.statusText} (${errText})`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || 'No interpretation generated.'
  }
}

export const aiManager = new AIManager()
