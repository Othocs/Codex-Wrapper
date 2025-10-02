# Codex-Wrapper

Codex is cool. Using it in the terminal not so much.

This workspace contains a Tauri desktop application that wraps the OpenAI Codex CLI in a beautiful, user-friendly chat interface.

## The App

The main application is in the `codex-wrapper/` directory. See [codex-wrapper/README.md](codex-wrapper/README.md) for full documentation.

### Quick Start

```bash
cd codex-wrapper
npm install
npm run tauri dev
```

### What's Built

✅ **Complete MVP** with:
- Folder-scoped Codex chat interface
- Streaming responses in real-time
- **File modification capabilities** (workspace-write sandbox)
- Stop generation button
- Session persistence (remembers last folder)
- Codex installation check on startup
- Dark mode support
- Clean, minimal UI

### Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Integration**: Mode A (stateless) - spawns Codex CLI per message
- **Platform**: macOS (Linux/Windows experimental)

Enjoy chatting with Codex without the terminal hassles! 🚀
