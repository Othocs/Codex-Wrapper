import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { FolderPicker } from './components/FolderPicker';
import { ChatPanel } from './components/ChatPanel';
import { StatusBar } from './components/StatusBar';
import { Message, CodexStatus } from './types';
import './App.css';

function App() {
  const [projectPath, setProjectPath] = useState<string | null>(() => {
    return localStorage.getItem('lastProjectPath');
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [codexStatus, setCodexStatus] = useState<CodexStatus | null>(null);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');

  // Check if Codex is installed on mount
  useEffect(() => {
    checkCodexInstalled();
  }, []);

  // Set up event listeners for Codex output
  useEffect(() => {
    const unlistenOutput = listen<string>('codex-output', (event) => {
      setCurrentAssistantMessage((prev) => prev + event.payload + '\n');
    });

    const unlistenError = listen<string>('codex-error', (event) => {
      console.error('[Frontend] Codex stderr:', event.payload);
    });

    const unlistenComplete = listen('codex-complete', () => {
      // Use functional update to get the current accumulated message
      setCurrentAssistantMessage((accumulated) => {
        if (accumulated.trim()) {
          const assistantMsg: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: accumulated.trim(),
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
        return ''; // Clear the accumulated message
      });
      setIsGenerating(false);
    });

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenError.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, []); // Empty dependency array - set up listeners only once

  // Save project path to localStorage
  useEffect(() => {
    if (projectPath) {
      localStorage.setItem('lastProjectPath', projectPath);
    }
  }, [projectPath]);

  const checkCodexInstalled = async () => {
    try {
      const status = await invoke<CodexStatus>('check_codex_installed');
      setCodexStatus(status);

      if (!status.installed) {
        alert(
          'Codex is not installed or not found in PATH.\n\n' +
          'Please install it using:\n' +
          '  npm i -g @openai/codex\n' +
          'or:\n' +
          '  brew install codex'
        );
      }
    } catch (error) {
      console.error('[Frontend] Failed to check Codex installation:', error);
    }
  };

  const handleFolderSelected = (path: string) => {
    setProjectPath(path);
    setMessages([]); // Clear messages when changing folders
  };

  const handleSendMessage = async (messageText: string) => {
    if (!projectPath) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);
    setCurrentAssistantMessage('');

    try {
      // Get last 3 messages as context (excluding the current one)
      const context = messages
        .slice(-6) // Last 3 pairs
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Codex'}: ${msg.content}`);

      await invoke('send_message', {
        message: messageText,
        projectPath,
        context,
      });
    } catch (error) {
      console.error('[Frontend] Failed to send message:', error);
      setIsGenerating(false);

      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${error}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleStopGeneration = () => {
    setIsGenerating(false);
    setCurrentAssistantMessage('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Codex Wrapper</h1>
        <FolderPicker
          onFolderSelected={handleFolderSelected}
          currentPath={projectPath}
        />
      </header>

      <main className="app-main">
        <ChatPanel
          messages={[
            ...messages,
            // Show streaming message if generating
            ...(isGenerating && currentAssistantMessage
              ? [{
                  id: 'streaming',
                  role: 'assistant' as const,
                  content: currentAssistantMessage,
                  timestamp: Date.now(),
                }]
              : [])
          ]}
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          disabled={!projectPath || !codexStatus?.installed}
        />
      </main>

      <footer className="app-footer">
        <StatusBar
          isGenerating={isGenerating}
          onStop={handleStopGeneration}
        />
        {codexStatus && !codexStatus.installed && (
          <div className="warning-banner">
            Codex is not installed. Please install it to use this app.
          </div>
        )}
      </footer>
    </div>
  );
}

export default App;
