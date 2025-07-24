import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { FileWatcher } from './services/FileWatcher';
import { PDFParser } from './services/PDFParser';
import { FileRenamer } from './services/FileRenamer';
import { Database } from './services/Database';
import { Logger } from './utils/logger';
import { registerIPCHandlers } from './ipc/handlers';
import { APP_CONFIG } from '@shared/constants/config';

const logger = new Logger('Main');
let mainWindow: BrowserWindow | null = null;
let fileWatcher: FileWatcher | null = null;
let database: Database | null = null;

const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: APP_CONFIG.WINDOW.WIDTH,
    height: APP_CONFIG.WINDOW.HEIGHT,
    minWidth: APP_CONFIG.WINDOW.MIN_WIDTH,
    minHeight: APP_CONFIG.WINDOW.MIN_HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    icon: path.join(__dirname, '../../resources/icon.ico'),
    title: '税務書類リネーマー'
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeServices() {
  try {
    // データベース初期化
    database = new Database();
    await database.initialize();
    logger.info('Database initialized');

    // ファイル監視サービス初期化
    fileWatcher = new FileWatcher({
      database,
      onFileDetected: (file) => {
        if (mainWindow) {
          mainWindow.webContents.send('file:detected', file);
        }
      }
    });
    logger.info('File watcher initialized');

    // IPCハンドラー登録
    const pdfParser = new PDFParser();
    const fileRenamer = new FileRenamer();
    
    registerIPCHandlers({
      fileWatcher,
      pdfParser,
      fileRenamer,
      database,
      logger
    });
    logger.info('IPC handlers registered');

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    dialog.showErrorBox('初期化エラー', 'アプリケーションの初期化に失敗しました。');
    app.quit();
  }
}

app.whenReady().then(async () => {
  await initializeServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // クリーンアップ処理
  if (fileWatcher) {
    await fileWatcher.stop();
  }
  if (database) {
    await database.close();
  }
});

// セキュリティ: 外部プロトコルのオープンを制限
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:3000' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});

// グローバルエラーハンドリング
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  dialog.showErrorBox('予期しないエラー', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});