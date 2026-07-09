# SpeakDB - Talk to your Database

**SpeakDB** is a privacy-first, **open source** desktop application that allows you to interact with your databases using simple, natural language. Think of it like **Cursor, but built specifically for SQL databases**. 

Instead of writing complex SQL queries from scratch, you can simply chat with your database in plain English, and SpeakDB's AI will compile, explain, and execute the queries for you.

---

## How It Works (In Simple Terms)

1. **Connect Safely**: Add your local or cloud database credentials. Because SpeakDB is a desktop app, your credentials and database connection stay **100% local on your computer** and are never sent to external servers.
2. **Chat in English**: Ask questions like *"show me the top 5 registered users this week"* or *"calculate total sales grouped by month"*.
3. **Execute & View**: SpeakDB translates your question into optimized SQL, displays it for your approval, and prints the live results in clean, organized tables.

---

## Core Features

* **Relational Database Support**: Deep integration with **PostgreSQL** (real query execution and database catalog extraction are already implemented), with adapters prepared for MySQL, SQLite, and SQL Server.
* **Flexible AI Providers**: Use cloud AI engines via **OpenRouter** (e.g. Llama 3, Claude, GPT) or run completely offline using local models via **Ollama**.
* **Smart Schema Compression**: SpeakDB automatically compresses your database structure (tables, columns, types, keys) by **70% to 80%** before sending it to the LLM. This guarantees that your database schema stays well within the AI model's context token limits.
* **Safe-Mode Guardrails**: Always prompts you to verify and approve statements (like INSERT, UPDATE, or DELETE) before executing them against your live databases.
* **Audit Logs**: Review your query history, execution latencies, and output counts.

---

## Getting Started & Development

### 1. Hardcode Your OpenRouter API Key (Optional)
To query OpenRouter models directly without using the UI Settings tab, open the file:
📂 `src/main/ai/aiManager.ts`

And paste your API key at the top of the file:
```typescript
const OPENROUTER_API_KEY: string = 'your-openrouter-key-here'
```

### 2. Setup & Run
Make sure you have Node.js installed, then run:

```bash
# Install dependencies
npm install

# Start the application in developer mode
npm run dev

# Audit code for TypeScript diagnostics
npm run typecheck
```

### 3. Packaging & Building Production App
To package the app into a standalone executable for your operating system:

```bash
# Package for Windows
npm run build:win

# Package for macOS
npm run build:mac

# Package for Linux
npm run build:linux
```
