import { ipcMain, dialog } from 'electron';
import { FileWatcher } from '../services/FileWatcher';
import { PDFParser } from '../services/PDFParser';
import { FileRenamer } from '../services/FileRenamer';
import { Database } from '../services/Database';
import { Logger } from '../utils/logger';
import { APP_CONFIG } from '@shared/constants/config';
import Store from 'electron-store';

interface Services {
  fileWatcher: FileWatcher;
  pdfParser: PDFParser;
  fileRenamer: FileRenamer;
  database: Database;
  logger: Logger;
}

const store = new Store();

export function registerIPCHandlers(services: Services) {
  const { fileWatcher, pdfParser, fileRenamer, database, logger } = services;

  // ファイルスキャン
  ipcMain.handle('file:scan', async (event, folders: string[]) => {
    try {
      const results = [];
      for (const folder of folders) {
        const files = await fileWatcher.scanFolder(folder);
        results.push(...files);
      }
      return { success: true, data: { files: results }, timestamp: Date.now() };
    } catch (error) {
      logger.error('File scan failed:', error);
      return {
        success: false,
        error: {
          code: 'SCAN_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: Date.now()
      };
    }
  });

  // PDF解析
  ipcMain.handle('file:parse-pdf', async (event, filePath: string) => {
    try {
      const document = await pdfParser.parse(filePath);
      return { success: true, data: { document }, timestamp: Date.now() };
    } catch (error) {
      logger.error('PDF parse failed:', error);
      return {
        success: false,
        error: {
          code: 'PARSE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: Date.now()
      };
    }
  });

  // ファイルリネーム
  ipcMain.handle('file:rename', async (event, params: {
    fileId: string;
    oldPath: string;
    newName: string;
    targetFolder: string;
  }) => {
    try {
      const result = await fileRenamer.renameFile({
        fileId: params.fileId,
        oldPath: params.oldPath,
        newName: params.newName,
        targetFolder: params.targetFolder,
        createSubfolders: true,
        backup: true
      });

      if (result.success) {
        // 処理済みファイルとして記録
        await database.recordProcessedFile({
          path: result.newPath,
          originalName: params.oldPath,
          newName: params.newName,
          documentType: 'UNKNOWN'
        });
        fileWatcher.markFileAsProcessed(params.oldPath);
      }

      return { success: result.success, data: result, timestamp: Date.now() };
    } catch (error) {
      logger.error('File rename failed:', error);
      return {
        success: false,
        error: {
          code: 'RENAME_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: Date.now()
      };
    }
  });

  // バッチ処理
  ipcMain.handle('file:batch-process', async (event, operations: any[]) => {
    try {
      const results = await fileRenamer.batchRename(operations);
      
      // 成功したファイルを記録
      for (let i = 0; i < results.length; i++) {
        if (results[i].success) {
          await database.recordProcessedFile({
            path: results[i].newPath,
            originalName: operations[i].oldPath,
            newName: operations[i].newName,
            documentType: operations[i].documentType || 'UNKNOWN'
          });
          fileWatcher.markFileAsProcessed(operations[i].oldPath);
        }
      }

      const totalFiles = results.length;
      const processedFiles = results.filter(r => r.success).length;
      const failedFiles = results.filter(r => !r.success).length;

      return {
        success: true,
        data: {
          totalFiles,
          processedFiles,
          failedFiles,
          results
        },
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Batch process failed:', error);
      return {
        success: false,
        error: {
          code: 'BATCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: Date.now()
      };
    }
  });

  // 設定取得
  ipcMain.handle('settings:get', async () => {
    try {
      const settings = store.get('settings', {
        app: {
          theme: 'light',
          language: 'ja',
          autoStart: false,
          minimizeToTray: true
        },
        watcher: {
          folders: [APP_CONFIG.DEFAULT_FOLDERS.DOWNLOADS],
          fileTypes: APP_CONFIG.FILE_TYPES.SUPPORTED,
          pollInterval: 5000,
          autoProcess: false
        },
        rename: {
          backupEnabled: true,
          preserveOriginalDate: false
        },
        notification: {
          enabled: true,
          sound: true,
          showProgress: true
        }
      });

      return { success: true, data: { settings }, timestamp: Date.now() };
    } catch (error) {
      logger.error('Get settings failed:', error);
      return {
        success: false,
        error: {
          code: 'SETTINGS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: Date.now()
      };
    }
  });

  // 設定更新
  ipcMain.handle('settings:update', async (event, settings: any) => {
    try {
      const currentSettings = store.get('settings', {});
      const updatedSettings = { ...currentSettings, ...settings };
      store.set('settings', updatedSettings);

      // ファイル監視フォルダを更新
      if (settings.watcher?.folders) {
        fileWatcher.updateWatchedFolders(settings.watcher.folders);
      }

      return { success: true, data: { settings: updatedSettings }, timestamp: Date.now() };
    } catch (error) {
      logger.error('Update settings failed:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: Date.now()
      };
    }
  });

  // クライアント一覧取得
  ipcMain.handle('client:list', async () => {
    try {
      const clients = await database.getClients();
      return {
        success: true,
        data: {
          clients,
          pagination: {
            total: clients.length,
            page: 1,
            limit: 50,
            pages: 1
          }
        },
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Get clients failed:', error);
      return {
        success: false,
        error: {
          code: 'GET_CLIENTS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: Date.now()
      };
    }
  });

  // クライアント作成
  ipcMain.handle('client:create', async (event, clientData: any) => {
    try {
      const client = await database.createClient(clientData);
      return { success: true, data: { client }, timestamp: Date.now() };
    } catch (error) {
      logger.error('Create client failed:', error);
      return {
        success: false,
        error: {
          code: 'CREATE_CLIENT_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: Date.now()
      };
    }
  });

  // クライアント更新
  ipcMain.handle('client:update', async (event, { id, updates }: any) => {
    try {
      const client = await database.updateClient(id, updates);
      return { success: true, data: { client }, timestamp: Date.now() };
    } catch (error) {
      logger.error('Update client failed:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_CLIENT_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: Date.now()
      };
    }
  });

  // フォルダ選択ダイアログ
  ipcMain.handle('dialog:select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, data: { path: result.filePaths[0] }, timestamp: Date.now() };
    }

    return { success: false, data: null, timestamp: Date.now() };
  });

  logger.info('IPC handlers registered successfully');
}