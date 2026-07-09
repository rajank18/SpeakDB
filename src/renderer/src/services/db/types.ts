export interface ColumnSchema {
  name: string
  dataType: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  referencedTable?: string
  referencedColumn?: string
  isNullable: boolean
  defaultValue?: string
}

export interface TableSchema {
  name: string
  columns: ColumnSchema[]
  rowCount?: number
}

export interface DatabaseSchema {
  databaseName: string
  tables: TableSchema[]
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  executionTimeMs: number
  affectedRows?: number
  error?: string
}

export interface DBConnectionConfig {
  type: 'postgres' | 'mysql' | 'sqlite' | 'mssql'
  host?: string
  port?: number
  database: string
  username?: string
  password?: string
  filepath?: string // SQLite filepath
  ssl?: boolean
}

export interface IDatabaseProvider {
  /**
   * Type identifier of the provider
   */
  readonly type: 'postgres' | 'mysql' | 'sqlite' | 'mssql'

  /**
   * Establishes a database connection using the provided configuration
   */
  connect(config: DBConnectionConfig): Promise<boolean>

  /**
   * Closes the active database connection
   */
  disconnect(): Promise<void>

  /**
   * Executes a raw SQL query against the database connection
   */
  executeQuery(sql: string, maxRows?: number): Promise<QueryResult>

  /**
   * Extracts and models the complete relational schema catalog
   */
  getSchema(): Promise<DatabaseSchema>

  /**
   * Test connection without storing session credentials
   */
  testConnection(config: DBConnectionConfig): Promise<{ success: boolean; error?: string }>
}
