export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface CodexStatus {
  installed: boolean;
  version?: string;
  error?: string;
}

export interface AppState {
  projectPath: string | null;
  messages: Message[];
  isGenerating: boolean;
  codexStatus: CodexStatus | null;
}
