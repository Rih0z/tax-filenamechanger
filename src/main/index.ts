import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { FileWatcher } from './services/FileWatcher';
import { PDFParser } from './services/PDFParser';
import { FileRenamer } from './services/FileRenamer';
import { DatabaseService } from './services/Database';
import { SimpleLogger as Logger } from './utils/simple-logger';
import { registerIPCHandlers } from './ipc/handlers';
import { APP_CONFIG } from '../shared/constants/config';

const logger = new Logger('Main');
let mainWindow: BrowserWindow | null = null;
let fileWatcher: FileWatcher | null = null;
let database: DatabaseService | null = null;

const isDev = process.env.NODE_ENV === 'development';

// グローバルエラーハンドラー
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
});

async function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: APP_CONFIG.WINDOW.WIDTH,
      height: APP_CONFIG.WINDOW.HEIGHT,
      minWidth: APP_CONFIG.WINDOW.MIN_WIDTH,
      minHeight: APP_CONFIG.WINDOW.MIN_HEIGHT,
      webPreferences: {
        preload: path.join(__dirname, 'main/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      },
      // icon: path.join(__dirname, '../../resources/icon.ico'),
      title: '税務書類リネーマー',
      show: false // まず非表示で作成
    });
    
    logger.info('Main window created successfully');

    if (isDev) {
      await mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
    } else {
      await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
    
    logger.info('Page loaded successfully');

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
    
    // すべて準備完了後に表示
    mainWindow.show();
    logger.info('Main window shown');
    
  } catch (error) {
    logger.error('Error creating window:', error);
    throw error;
  }
}

async function initializeServices() {
  try {
    // データベース初期化
    database = new DatabaseService();
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
  try {
    logger.info('App ready, initializing services...');
    await initializeServices();
    await createWindow();
    logger.info('Application started successfully');
  } catch (error) {
    logger.error('Failed to start application:', error);
    dialog.showErrorBox('起動エラー', 'アプリケーションの起動に失敗しました。');
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch(err => {
        logger.error('Failed to create window on activate:', err);
      });
    }
  });
}).catch(error => {
  logger.error('App ready failed:', error);
  app.quit();
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
  logger.info('App cleanup completed');
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
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason?.toString() || 'unknown reason'}`);
});