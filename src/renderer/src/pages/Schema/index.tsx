import React from 'react'
import {
  Table,
  Key,
  Layers,
  ArrowRightLeft,
  FileSpreadsheet
} from 'lucide-react'
import { useConnectionStore } from '../../store/connectionStore'
import { cn } from '../../lib/utils'

interface ColumnDefinition {
  name: string
  type: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  foreignKeyTarget?: string
  nullable: boolean
}

interface TableDefinition {
  name: string
  rowCount: number
  columns: ColumnDefinition[]
}

const Schema: React.FC = () => {
  const { activeConnection } = useConnectionStore()

  // Mock schema definitions for SQLite/Postgres demo when database connected
  const mockTables: TableDefinition[] = [
    {
      name: 'users',
      rowCount: 1485,
      columns: [
        { name: 'id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: false, nullable: false },
        { name: 'name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, nullable: false },
        { name: 'email', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false, nullable: false },
        { name: 'role', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false, nullable: true },
        { name: 'status', type: 'VARCHAR(10)', isPrimaryKey: false, isForeignKey: false, nullable: false },
        { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false, nullable: false }
      ]
    },
    {
      name: 'orders',
      rowCount: 4210,
      columns: [
        { name: 'id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: false, nullable: false },
        { name: 'user_id', type: 'INTEGER', isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: 'users.id', nullable: false },
        { name: 'total_amount', type: 'DECIMAL(10, 2)', isPrimaryKey: false, isForeignKey: false, nullable: false },
        { name: 'status', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false, nullable: false },
        { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false, nullable: false }
      ]
    },
    {
      name: 'products',
      rowCount: 320,
      columns: [
        { name: 'id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: false, nullable: false },
        { name: 'sku', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, nullable: false },
        { name: 'title', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false, nullable: false },
        { name: 'price', type: 'DECIMAL(10, 2)', isPrimaryKey: false, isForeignKey: false, nullable: false },
        { name: 'stock', type: 'INTEGER', isPrimaryKey: false, isForeignKey: false, nullable: false }
      ]
    },
    {
      name: 'order_items',
      rowCount: 9840,
      columns: [
        { name: 'id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: false, nullable: false },
        { name: 'order_id', type: 'INTEGER', isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: 'orders.id', nullable: false },
        { name: 'product_id', type: 'INTEGER', isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: 'products.id', nullable: false },
        { name: 'quantity', type: 'INTEGER', isPrimaryKey: false, isForeignKey: false, nullable: false },
        { name: 'unit_price', type: 'DECIMAL(10, 2)', isPrimaryKey: false, isForeignKey: false, nullable: false }
      ]
    }
  ]

  const [selectedTableName, setSelectedTableName] = React.useState(mockTables[0].name)

  const selectedTable = mockTables.find((t) => t.name === selectedTableName) || mockTables[0]

  return (
    <div className="flex h-[calc(100vh-80px)] mx-[-20px] mb-[-32px] overflow-hidden animate-fade-in">

      {/* Sidebar List */}
      <div className="w-64 border-r border-border bg-transparent flex flex-col shrink-0 select-none">
        <div className="p-4 pl-8 border-b border-border">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Layers className="h-4 w-4 text-primary" />
            <span>SCHEMA TABLES ({activeConnection ? mockTables.length : 'Offline'})</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 pl-5 space-y-1">
          {!activeConnection ? (
            <div className="text-center text-xs text-muted-foreground p-6 mt-4">
              Connect database to explore schema. Showing sandbox layout.
            </div>
          ) : null}

          {mockTables.map((t) => (
            <div
              key={t.name}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold cursor-pointer transition-all",
                selectedTableName === t.name
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              onClick={() => setSelectedTableName(t.name)}
            >
              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                <Table className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{t.name}</span>
              </div>
              <span className="text-[10px] bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                {t.rowCount} rows
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Schema View */}
      <div className="flex-1 flex flex-col bg-background/5 overflow-hidden p-6 select-none">
        <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Table className="h-5 w-5 text-primary" />
              <span>{selectedTable.name}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Definition & column mapping schema details. Row count: {selectedTable.rowCount} rows
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-muted/40 rounded-lg p-1 px-3 py-1.5 border border-border/50 text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Generate mock CSV schema</span>
          </div>
        </div>

        {/* Columns Grid */}
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="border border-border/80 bg-card/20 rounded-xl overflow-x-auto shadow">
            <table className="min-w-full text-xs border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-card/40">
                  <th className="p-3.5 font-bold text-muted-foreground uppercase tracking-wider">Column</th>
                  <th className="p-3.5 font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="p-3.5 font-bold text-muted-foreground uppercase tracking-wider text-center">Nullable</th>
                  <th className="p-3.5 font-bold text-muted-foreground uppercase tracking-wider text-center">Primary Key</th>
                  <th className="p-3.5 font-bold text-muted-foreground uppercase tracking-wider">Key Reference</th>
                </tr>
              </thead>
              <tbody>
                {selectedTable.columns.map((col) => (
                  <tr key={col.name} className="border-b border-border/40 hover:bg-card/10">
                    <td className="p-3.5 font-mono text-foreground font-semibold flex items-center gap-2">
                      {col.isPrimaryKey ? (
                        <Key className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      ) : col.isForeignKey ? (
                        <ArrowRightLeft className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{col.name}</span>
                    </td>
                    <td className="p-3.5 font-mono text-indigo-300 font-semibold">{col.type}</td>
                    <td className="p-3.5 text-center text-muted-foreground font-medium">
                      {col.nullable ? 'YES' : 'NO'}
                    </td>
                    <td className="p-3.5 text-center font-bold text-muted-foreground">
                      {col.isPrimaryKey ? (
                        <span className="text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded text-[10px]">PK</span>
                      ) : '--'}
                    </td>
                    <td className="p-3.5 text-muted-foreground font-semibold">
                      {col.isForeignKey && col.foreignKeyTarget ? (
                        <span className="text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded text-[10px] font-mono">
                          FK ➔ {col.foreignKeyTarget}
                        </span>
                      ) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Schema
