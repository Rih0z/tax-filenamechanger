import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { FileInfo, ParsedDocument, RenameResult, Client, AppSettings } from '@shared/types';

// レンダラープロセスに公開するAPI
const electronAPI = {
  // ファイル操作
  scanFiles: (folders: string[]) => 
    ipcRenderer.invoke('file:scan', folders),
  
  parsePDF: (filePath: string) => 
    ipcRenderer.invoke('file:parse-pdf', filePath),
  
  renameFile: (params: { fileId: string; newName: string; targetFolder: string }) => 
    ipcRenderer.invoke('file:rename', params),
  
  batchProcess: (operations: any[]) => 
    ipcRenderer.invoke('file:batch-process', operations),

  // 設定管理
  getSettings: () => 
    ipcRenderer.invoke('settings:get'),
  
  updateSettings: (settings: Partial<AppSettings>) => 
    ipcRenderer.invoke('settings:update', settings),

  // クライアント管理
  getClients: () => 
    ipcRenderer.invoke('client:list'),
  
  createClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => 
    ipcRenderer.invoke('client:create', client),
  
  updateClient: (id: string, updates: Partial<Client>) => 
    ipcRenderer.invoke('client:update', { id, updates }),

  // フォルダ選択ダイアログ
  selectFolder: () => 
    ipcRenderer.invoke('dialog:select-folder'),

  // イベントリスナー
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    const validChannels = ['file:detected', 'process:progress', 'error:occurred'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
  
  off: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  }
};

// コンテキストブリッジを使用してAPIを安全に公開
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript用の型定義
export type ElectronAPI = typeof electronAPI;