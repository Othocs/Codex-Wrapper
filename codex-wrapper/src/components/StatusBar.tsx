import { invoke } from '@tauri-apps/api/core';

interface StatusBarProps {
  isGenerating: boolean;
  onStop: () => void;
}

export function StatusBar({ isGenerating, onStop }: StatusBarProps) {
  const handleStop = async () => {
    try {
      await invoke('stop_generation');
      onStop();
    } catch (error) {
      console.error('Failed to stop generation:', error);
    }
  };

  return (
    <div className="status-bar">
      {isGenerating ? (
        <>
          <div className="status-indicator generating">
            <span className="spinner"></span>
            <span>Codex is thinking...</span>
          </div>
          <button onClick={handleStop} className="btn-stop">
            Stop
          </button>
        </>
      ) : (
        <div className="status-indicator idle">
          <span className="status-dot"></span>
          <span>Ready</span>
        </div>
      )}
    </div>
  );
}
