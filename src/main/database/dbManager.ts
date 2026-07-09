import { Client } from 'pg'
import { DBConnectionConfig, QueryResult, DatabaseSchema, ColumnSchema, TableSchema } from '../../renderer/src/services/db/types'

export class DatabaseManager {
  private client: Client | null = null
  private activeConnection: any = null
  private activeConfig: DBConnectionConfig | null = null

  /**
   * Test credentials and establish connection session
   */
  public async connect(config: DBConnectionConfig): Promise<boolean> {
    if (this.client) {
      await this.disconnect()
    }

    this.activeConfig = config

    if (config.type === 'postgres') {
      this.client = new Client({
        host: config.host || 'localhost',
        port: config.port || 5432,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined
      })
      await this.client.connect()
      this.activeConnection = this.client
      return true
    }

    throw new Error(`Connection type "${config.type}" is not supported yet.`)
  }

  /**
   * Disconnect any active database session
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.end()
      } catch (err) {
        console.error('Error closing Postgres client:', err)
      }
      this.client = null
    }
    this.activeConnection = null
    this.activeConfig = null
  }

  /**
   * Safely execute query against session
   */
  public async executeQuery(sql: string, maxRows = 100): Promise<QueryResult> {
    if (!this.client || !this.activeConnection) {
      throw new Error('No active database connection established.')
    }

    const startTime = Date.now()
    const res = await this.client.query(sql)
    const executionTimeMs = Date.now() - startTime

    const columns = res.fields ? res.fields.map((f) => f.name) : []
    const rows = Array.isArray(res.rows) ? res.rows.slice(0, maxRows) : []

    return {
      columns,
      rows,
      executionTimeMs,
      affectedRows: res.rowCount ?? undefined
    }
  }

  /**
   * Refreshes the cached schema definitions
   */
  public async getSchema(): Promise<DatabaseSchema> {
    if (!this.client || !this.activeConfig) {
      throw new Error('No active database session to fetch schema from.')
    }

    // 1. Fetch all columns metadata from information_schema
    const columnsRes = await this.client.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `)

    // 2. Fetch primary keys
    const pkRes = await this.client.query(`
      SELECT 
        kcu.table_name, 
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' 
        AND tc.table_schema = 'public';
    `)

    // 3. Fetch foreign keys mapping
    const fkRes = await this.client.query(`
      SELECT
        tc.table_name AS table_name,
        kcu.column_name AS column_name,
        ccu.table_name AS referenced_table_name,
        ccu.column_name AS referenced_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public';
    `)

    // Build helper indexes for constraints
    const pkSet = new Set<string>()
    pkRes.rows.forEach((row: any) => {
      pkSet.add(`${row.table_name}.${row.column_name}`)
    })

    const fkMap = new Map<string, { referencedTable: string; referencedColumn: string }>()
    fkRes.rows.forEach((row: any) => {
      fkMap.set(`${row.table_name}.${row.column_name}`, {
        referencedTable: row.referenced_table_name,
        referencedColumn: row.referenced_column_name
      })
    })

    // Group columns by table name
    const tablesMap = new Map<string, ColumnSchema[]>()
    
    columnsRes.rows.forEach((row: any) => {
      const tableName = row.table_name
      const columnName = row.column_name
      const keyStr = `${tableName}.${columnName}`

      const isPrimaryKey = pkSet.has(keyStr)
      const fkInfo = fkMap.get(keyStr)

      const colSchema: ColumnSchema = {
        name: columnName,
        dataType: row.data_type,
        isPrimaryKey,
        isForeignKey: !!fkInfo,
        referencedTable: fkInfo?.referencedTable,
        referencedColumn: fkInfo?.referencedColumn,
        isNullable: row.is_nullable === 'YES',
        defaultValue: row.column_default || undefined
      }

      if (!tablesMap.has(tableName)) {
        tablesMap.set(tableName, [])
      }
      tablesMap.get(tableName)!.push(colSchema)
    })

    // Map table sizes (row counts)
    const tablesList: TableSchema[] = []
    
    for (const [tableName, columns] of tablesMap.entries()) {
      let rowCount = 0
      try {
        // Query estimated row count for speed
        const countRes = await this.client.query(`
          SELECT reltuples::bigint AS count 
          FROM pg_class 
          WHERE relname = $1;
        `, [tableName])
        rowCount = Number(countRes.rows[0]?.count || 0)
      } catch (err) {
        console.error(`Error fetching count for table ${tableName}:`, err)
      }

      tablesList.push({
        name: tableName,
        columns,
        rowCount
      })
    }

    return {
      databaseName: this.activeConfig.database,
      tables: tablesList
    }
  }

  /**
   * Tests a connection parameters set without modifying current connection cache
   */
  public async testConnection(config: DBConnectionConfig): Promise<{ success: boolean; error?: string }> {
    if (config.type !== 'postgres') {
      return { success: false, error: `Connection type "${config.type}" is not supported yet.` }
    }

    const testClient = new Client({
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000
    })

    try {
      await testClient.connect()
      await testClient.query('SELECT 1')
      await testClient.end()
      return { success: true }
    } catch (e: any) {
      try {
        await testClient.end()
      } catch (_) {}
      return { success: false, error: e.message || String(e) }
    }
  }
}

export const dbManager = new DatabaseManager()
