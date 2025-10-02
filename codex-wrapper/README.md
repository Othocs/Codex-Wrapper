# Codex Wrapper

A minimal, elegant desktop application that wraps the OpenAI Codex CLI in a clean chat interface. Built with Tauri and React.

## Features

- 🎯 **Clean Chat Interface**: Simple, distraction-free UI for interacting with Codex
- 📁 **Folder-Scoped**: Select any folder and Codex will work within that context
- ⚡ **Streaming Responses**: See Codex's output in real-time as it generates
- 🛑 **Stop Generation**: Interrupt Codex at any time with the stop button
- 💾 **Session Persistence**: Automatically remembers your last folder
- 🎨 **Dark Mode Support**: Adapts to your system theme preferences
- 🔒 **Workspace Sandbox**: Codex can modify files within the selected folder only (sandboxed for safety)

## Prerequisites

Before using this app, you need to have:

1. **Rust** - Required for building Tauri apps
   - Install from: https://www.rust-lang.org/tools/install
   - Or via Homebrew: `brew install rust`

2. **Codex CLI** - The OpenAI Codex command-line tool
   ```bash
   # Install via npm
   npm install -g @openai/codex

   # Or via Homebrew
   brew install codex
   ```

3. **Node.js & npm** - For frontend dependencies
   - Download from: https://nodejs.org/

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd codex-wrapper

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Usage

1. **Launch the App**: Run `npm run tauri dev` or launch the built application

2. **Check Codex Installation**: On first launch, the app will verify that Codex is installed. If not found, you'll see installation instructions.

3. **Select a Folder**: Click "Select Folder" and choose the project directory you want to work with. Codex will be scoped to this folder.

   ⚠️ **Important**: Codex can create, modify, and delete files within this folder. Choose a safe folder or ensure you have backups/version control.

4. **Start Chatting**: Type your message in the composer at the bottom and press Enter (or Shift+Enter for new lines).

5. **View Responses**: Codex's responses will stream in real-time. The status bar shows when Codex is thinking.

6. **Stop if Needed**: Click the "Stop" button at any time to interrupt Codex.

## Architecture

### Mode A: Stateless Chat (Current Implementation)

The app uses a **stateless** approach where each message spawns a new Codex process:

- **Pros**: Simple, easy to manage, no PTY complications, full file modification capabilities
- **Cons**: No persistent Codex session; context is managed client-side
- **Safety**: Runs in **workspace-write sandbox** (can modify files in selected folder only)
- **How it works**:
  - User sends a message
  - App builds context from last 3 message pairs
  - Spawns `codex exec --sandbox workspace-write -C <folder> "<context + message>"`
  - Streams output back to UI in real-time
  - Process completes and is cleaned up

**Command Details**:
- Uses `codex exec` for non-interactive mode (works with piped stdout)
- `--sandbox workspace-write` allows file creation/modification within workspace
- Commands execute automatically without approval prompts (nature of `exec` mode)
- `--skip-git-repo-check` allows any folder to be selected
- `-C <folder>` sets the working directory for Codex

**Security Boundaries**:
- ✅ Can create/modify/delete files in selected folder
- ✅ Can read files in selected folder
- ✅ Can execute shell commands scoped to the folder
- ❌ Cannot access files outside the workspace
- ❌ Network access disabled by default
- ❌ Cannot access system files or parent directories

### Future Enhancements (Roadmap)

- **Mode B: Persistent Session** - Long-lived Codex process with PTY for true interactive chat
- **Sandbox Mode Toggle** - UI option to switch between read-only and workspace-write modes
- **Model Switcher** - Toggle between GPT-5 and GPT-5-Codex
- **MCP Integration** - Add MCP servers for extended capabilities
- **Cross-Platform** - Full support for Linux and Windows (currently experimental)

## Project Structure

```
codex-wrapper/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── FolderPicker.tsx
│   │   ├── ChatPanel.tsx
│   │   ├── MessageBubble.tsx
│   │   └── StatusBar.tsx
│   ├── types.ts           # TypeScript interfaces
│   ├── App.tsx            # Main app component
│   └── App.css            # Styling
├── src-tauri/             # Rust backend
│   ├── src/
│   │   └── lib.rs         # Tauri commands
│   ├── capabilities/      # Permissions
│   └── tauri.conf.json    # Tauri configuration
└── package.json
```

## Development

### Available Commands

- `npm run dev` - Start Vite dev server
- `npm run build` - Build frontend
- `npm run tauri dev` - Run Tauri in development mode
- `npm run tauri build` - Build production app

### Tauri Commands (Rust → JS)

- `open_folder()` - Opens native folder picker
- `check_codex_installed()` - Verifies Codex CLI is available
- `send_message(message, projectPath, context)` - Spawns Codex process
- `stop_generation()` - Kills active Codex process

### Events (Rust → JS)

- `codex-output` - Streams stdout from Codex line-by-line
- `codex-error` - Streams stderr from Codex
- `codex-complete` - Signals process completion

## Debugging

The app has comprehensive logging to help you debug issues:

### Backend Logs (Rust/Terminal)

**Where**: In the terminal where you run `npm run tauri dev`

**What you'll see**:
```
[Rust] send_message called
[Rust] Message: hello
[Rust] Project path: /Users/you/project
[Rust] Spawning codex process...
[Rust] Codex process spawned successfully (PID: 12345)
[Rust-Thread] stdout reader started
[Rust-Thread] stdout line 1: Codex response...
[Rust-Thread] Emitted codex-complete event
```

**Why this is useful**: Shows if Codex is actually being spawned, if it's outputting data, and if events are being emitted to the frontend.

### Frontend Logs (React/DevTools)

**Where**: Right-click in the app window → **"Inspect Element"** or press `Cmd+Option+I` (macOS) / `Ctrl+Shift+I` (Windows/Linux)

**What you'll see**:
- Only errors and critical events
- Codex stderr output (if any)

**Why this is useful**: Helps debug frontend state management and React rendering issues.

### Common Debug Scenarios

**"Codex thinking forever"**:
1. Check terminal logs - is the process spawning?
2. Look for `[Rust-Thread] stdout line X` - is Codex outputting?
3. Check for `Emitted codex-complete event` - is completion firing?

**"No response at all"**:
1. Terminal should show `[Rust] send_message called`
2. If missing, check frontend DevTools for errors
3. Verify `projectPath` is set correctly

**"Process won't stop"**:
1. Look for `[Rust] stop_generation called` in terminal
2. Check for `Process killed successfully` confirmation

## Troubleshooting

### "Codex not found"
Ensure Codex CLI is installed and in your PATH:
```bash
codex --version
```

### "Rust not installed"
Install Rust before building Tauri:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Build fails
Try cleaning and rebuilding:
```bash
rm -rf node_modules dist
npm install
npm run tauri build
```

## Contributing

Contributions welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Credits

Built with:
- [Tauri](https://tauri.app/) - Desktop application framework
- [React](https://react.dev/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [OpenAI Codex](https://github.com/openai/codex) - AI coding assistant
