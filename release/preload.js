const { contextBridge, ipcRenderer } = require('electron');

// レンダラープロセスで使用できるAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
    // フォルダ選択
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    
    // フォルダスキャン
    scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
    
    // ファイル処理
    processFiles: (fileList, outputPath) => 
        ipcRenderer.invoke('process-files', fileList, outputPath),
    
    // 監視開始
    startWatching: (folderPath) => ipcRenderer.invoke('start-watching', folderPath),
    
    // 監視停止
    stopWatching: () => ipcRenderer.invoke('stop-watching'),
    
    // 設定保存
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    
    // 設定読み込み
    loadSettings: () => ipcRenderer.invoke('load-settings'),
    
    // フォルダを開く
    openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
    
    // フォルダ変更イベントリスナー
    onFolderChanged: (callback) => {
        ipcRenderer.on('folder-changed', (event, folderPath) => {
            callback(folderPath);
        });
    }
});