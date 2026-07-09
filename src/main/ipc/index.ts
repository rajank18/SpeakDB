import { ipcMain } from 'electron'
import { dbManager } from '../database/dbManager'
import { aiManager } from '../ai/aiManager'

export function registerIPCHandlers(): void {
  // Database IPC Handlers
  ipcMain.handle('db:connect', async (_, config) => {
    return dbManager.connect(config)
  })

  ipcMain.handle('db:disconnect', async (_) => {
    return dbManager.disconnect()
  })

  ipcMain.handle('db:execute-query', async (_, sql, maxRows) => {
    return dbManager.executeQuery(sql, maxRows)
  })

  ipcMain.handle('db:get-schema', async (_) => {
    return dbManager.getSchema()
  })

  ipcMain.handle('db:test-connection', async (_, config) => {
    return dbManager.testConnection(config)
  })

  // AI IPC Handlers
  ipcMain.handle('ai:generate-sql', async (_, prompt, schema, config) => {
    return aiManager.generateSQL(prompt, schema, config)
  })

  ipcMain.handle('ai:explain-sql', async (_, sql, schema, config) => {
    return aiManager.explainSQL(sql, schema, config)
  })

  ipcMain.handle('ai:optimize-sql', async (_, sql, schema, config) => {
    return aiManager.optimizeSQL(sql, schema, config)
  })

  ipcMain.handle('ai:chat', async (_, history, schema, config) => {
    return aiManager.chat(history, schema, config)
  })
}
