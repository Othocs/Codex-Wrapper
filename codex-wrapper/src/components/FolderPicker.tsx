import { invoke } from '@tauri-apps/api/core';

interface FolderPickerProps {
  onFolderSelected: (path: string) => void;
  currentPath: string | null;
}

export function FolderPicker({ onFolderSelected, currentPath }: FolderPickerProps) {
  const handleSelectFolder = async () => {
    try {
      const folder = await invoke<string | null>('open_folder');
      if (folder) {
        onFolderSelected(folder);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  return (
    <div className="folder-picker">
      <button onClick={handleSelectFolder} className="btn-primary">
        {currentPath ? 'Change Folder' : 'Select Folder'}
      </button>
      {currentPath && (
        <div className="folder-breadcrumb">
          <span className="folder-icon">📁</span>
          <span className="folder-path">{currentPath}</span>
        </div>
      )}
    </div>
  );
}
