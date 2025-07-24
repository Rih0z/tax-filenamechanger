import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { FileInfo } from '@shared/types';
import { APP_CONFIG } from '@shared/constants/config';
import { Logger } from '../utils/logger';
import { Database } from './Database';

export interface FileWatcherConfig {
  folders?: string[];
  fileTypes?: string[];
  pollInterval?: number;
  database: Database;
  onFileDetected?: (file: FileInfo) => void;
}

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private logger: Logger;
  private watchedFolders: string[];
  private fileTypes: string[];
  private database: Database;
  private onFileDetected?: (file: FileInfo) => void;
  private processedFiles: Set<string> = new Set();

  constructor(config: FileWatcherConfig) {
    this.logger = new Logger('FileWatcher');
    this.watchedFolders = config.folders || [APP_CONFIG.DEFAULT_FOLDERS.DOWNLOADS];
    this.fileTypes = config.fileTypes || APP_CONFIG.FILE_TYPES.SUPPORTED;
    this.database = config.database;
    this.onFileDetected = config.onFileDetected;
  }

  async start(folders?: string[]) {
    if (folders) {
      this.watchedFolders = folders;
    }

    this.logger.info(`Starting file watcher for folders: ${this.watchedFolders.join(', ')}`);

    // 既存の監視を停止
    if (this.watcher) {
      await this.stop();
    }

    // 処理済みファイルのリストを取得
    const processedFilesList = await this.database.getProcessedFiles();
    this.processedFiles = new Set(processedFilesList.map(f => f.path));

    // Chokidarの設定
    this.watcher = chokidar.watch(this.watchedFolders, {
      ignored: /(^|[\/\\])\../, // 隠しファイルを無視
      persistent: true,
      ignoreInitial: false, // 初回スキャンを実行
      awaitWriteFinish: {
        stabilityThreshold: 2000, // ファイル書き込み完了まで2秒待機
        pollInterval: 100
      },
      depth: 0 // サブフォルダは監視しない
    });

    // イベントハンドラー設定
    this.watcher
      .on('add', this.handleFileAdd.bind(this))
      .on('change', this.handleFileChange.bind(this))
      .on('unlink', this.handleFileRemove.bind(this))
      .on('error', this.handleError.bind(this))
      .on('ready', () => {
        this.logger.info('File watcher is ready');
      });
  }

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.logger.info('File watcher stopped');
    }
  }

  async scanFolder(folderPath: string): Promise<FileInfo[]> {
    this.logger.info(`Scanning folder: ${folderPath}`);
    
    try {
      const files = await fs.readdir(folderPath);
      const fileInfos: FileInfo[] = [];

      for (const fileName of files) {
        const filePath = path.join(folderPath, fileName);
        const fileInfo = await this.getFileInfo(filePath);
        
        if (fileInfo && this.isTargetFile(filePath) && !this.processedFiles.has(filePath)) {
          fileInfos.push(fileInfo);
        }
      }

      this.logger.info(`Found ${fileInfos.length} new files`);
      return fileInfos;
    } catch (error) {
      this.logger.error(`Error scanning folder: ${error}`);
      throw error;
    }
  }

  private async handleFileAdd(filePath: string) {
    if (!this.isTargetFile(filePath)) {
      return;
    }

    if (this.processedFiles.has(filePath)) {
      this.logger.debug(`File already processed: ${filePath}`);
      return;
    }

    this.logger.info(`New file detected: ${filePath}`);

    try {
      const fileInfo = await this.getFileInfo(filePath);
      if (fileInfo) {
        if (this.onFileDetected) {
          this.onFileDetected(fileInfo);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing file ${filePath}:`, error);
    }
  }

  private async handleFileChange(filePath: string) {
    if (!this.isTargetFile(filePath)) {
      return;
    }

    this.logger.debug(`File changed: ${filePath}`);
  }

  private handleFileRemove(filePath: string) {
    this.logger.debug(`File removed: ${filePath}`);
    this.processedFiles.delete(filePath);
  }

  private handleError(error: Error) {
    this.logger.error('File watcher error:', error);
  }

  private isTargetFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.fileTypes.includes(ext);
  }

  private async getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      const extension = path.extname(filePath).toLowerCase();

      return {
        id: uuidv4(),
        path: filePath,
        name: fileName,
        size: stats.size,
        extension: extension,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        isProcessed: false
      };
    } catch (error) {
      this.logger.error(`Error getting file info for ${filePath}:`, error);
      return null;
    }
  }

  updateWatchedFolders(folders: string[]) {
    this.watchedFolders = folders;
    if (this.watcher) {
      this.start(folders);
    }
  }

  markFileAsProcessed(filePath: string) {
    this.processedFiles.add(filePath);
  }
}