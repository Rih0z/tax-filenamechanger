const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { PDFParser, FileRenamer, TaxDocumentProcessor } = require('./standalone-runner.js');

// グローバル変数
let mainWindow;
let watchFolder = 'C:\\Downloads';
let outputFolder = 'C:\\TaxDocs\\2024';
let isWatching = false;
let watchInterval = null;
let processedFiles = new Set();

// 開発モードかどうか
const isDev = process.env.NODE_ENV === 'development';

// メインウィンドウ作成
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.ico'), // アイコンファイル（後で作成）
        title: '税務書類自動リネームシステム'
    });

    // HTMLファイルを読み込む
    mainWindow.loadFile('index.html');

    // 開発ツール（開発時のみ）
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // ウィンドウが閉じられたら
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// アプリケーションの準備ができたら
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 全てのウィンドウが閉じられたら
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC通信のセットアップ
// フォルダ選択ダイアログ
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

// フォルダスキャン
ipcMain.handle('scan-folder', async (event, folderPath) => {
    if (!fs.existsSync(folderPath)) {
        throw new Error('フォルダが存在しません');
    }

    try {
        const files = fs.readdirSync(folderPath)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ext === '.pdf' || ext === '.csv';
            })
            .map(file => {
                const filePath = path.join(folderPath, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    size: stats.size,
                    isNew: !processedFiles.has(filePath)
                };
            });

        return files;
    } catch (error) {
        throw new Error(`フォルダスキャンエラー: ${error.message}`);
    }
});

// ファイル処理
ipcMain.handle('process-files', async (event, fileList, outputPath) => {
    const parser = new PDFParser();
    const renamer = new FileRenamer();
    const results = [];

    for (const file of fileList) {
        try {
            // ファイル名解析
            const analysis = parser.analyzeFileName(file.name);
            
            // 推奨名生成
            let suggestedName = null;
            if (analysis.documentType !== '不明') {
                suggestedName = renamer.generateSuggestedName(
                    analysis.documentType,
                    analysis.companyName || 'デフォルト株式会社',
                    analysis.fiscalYear || '2407'
                );
            }

            // カスタム名が設定されている場合はそれを使用
            const finalName = file.customName || suggestedName;
            
            if (finalName) {
                // リネーム実行
                const result = await renamer.renameFile(file.path, finalName, outputPath);
                
                if (result.success) {
                    processedFiles.add(file.path);
                    results.push({
                        original: file.name,
                        renamed: suggestedName,
                        category: result.categoryFolder,
                        success: true
                    });
                } else {
                    results.push({
                        original: file.name,
                        error: result.error,
                        success: false
                    });
                }
            } else {
                results.push({
                    original: file.name,
                    error: '推奨名を生成できませんでした',
                    success: false
                });
            }
        } catch (error) {
            results.push({
                original: file.name,
                error: error.message,
                success: false
            });
        }
    }

    return results;
});

// 監視開始
ipcMain.handle('start-watching', async (event, folderPath) => {
    if (isWatching) return false;
    
    watchFolder = folderPath;
    isWatching = true;
    
    // 5秒ごとにスキャン
    watchInterval = setInterval(() => {
        mainWindow.webContents.send('folder-changed', watchFolder);
    }, 5000);
    
    return true;
});

// 監視停止
ipcMain.handle('stop-watching', async () => {
    if (!isWatching) return false;
    
    isWatching = false;
    if (watchInterval) {
        clearInterval(watchInterval);
        watchInterval = null;
    }
    
    return true;
});

// 設定保存
ipcMain.handle('save-settings', async (event, settings) => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        throw new Error(`設定保存エラー: ${error.message}`);
    }
});

// 設定読み込み
ipcMain.handle('load-settings', async () => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('設定読み込みエラー:', error);
    }
    
    // デフォルト設定
    return {
        watchFolder: 'C:\\Downloads',
        outputFolder: 'C:\\TaxDocs\\2024',
        autoProcess: true,
        createBackup: true,
        createSubfolders: true,
        defaultFiscalYear: '2407'
    };
});

// フォルダを開く
ipcMain.handle('open-folder', async (event, folderPath) => {
    if (fs.existsSync(folderPath)) {
        shell.openPath(folderPath);
        return true;
    }
    return false;
});