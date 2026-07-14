# SpeakDB - Secure Text2SQL Desktop Client

**SpeakDB** is a privacy-first, open-source desktop application that lets you query, analyze, and manage your SQL databases using plain English. Think of it as **Cursor, but built specifically for your database tables**.

SpeakDB translates your natural language questions into optimized, secure SQL, executes them against your database, and presents the output in structured data grids accompanied by natural-language summaries.

---

## Key Architecture Features

* **100% Local Execution**: Because SpeakDB is an Electron desktop app, database connections are established directly from your machine. Your database credentials, schemas, and query results never leave your computer.
* **Bounded Conversational Memory**: Supports follow-up questions (e.g., *"filter only active users"*) using a sliding-window memory of the last **5 validated turns**. The memory automatically resets if you switch databases or change the schema, preventing context pollution.
* **Zero-Cost Local Guardrails**: Simple greetings, identity questions, or jailbreak prompts are caught instantly under **1ms at $0 cost** using local pre-filters, preventing wasted tokens on cloud API endpoints.
* **Natural-Language Summaries**: Translates tabular database outputs back into plain English explanations, making query results understandable at a glance.
* **Multi-Dialect Core**: Normalized adapter wrapper supporting **PostgreSQL**, **MySQL**, **MariaDB**, **SQLite**, and **SQL Server**.
* **Startup Auto-Connect**: A rehydration tracker monitors your saved state and automatically reconnects your last-selected active database when the application starts.
* **Safety interceptors**: Automatically identifies destructive commands (`DROP`, `DELETE`, `TRUNCATE`) and prompts you with a safe-mode approval overlay before executing them.

---

## Getting Started & Development

### 1. Setup Environment
To load API keys automatically on startup, create a `.env` file in the root directory:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

*(You can also configure API keys dynamically inside the application's UI Settings panel).*

### 2. Install & Run
Make sure you have Node.js installed, then run the following:

```bash
# Install dependencies
npm install

# Start the application in development mode
npm run dev

# Run TypeScript checks
npm run typecheck
```

---

## Production Builds

To package the application into a single standalone executable for your operating system:

```bash
# Package for Windows (.exe)
npm run build:win

# Package for macOS (.dmg)
npm run build:mac

# Package for Linux (.AppImage)
npm run build:linux
```

The packaged executables will be generated inside the `dist/` directory.

