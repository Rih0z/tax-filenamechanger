import fs from 'fs-extra';
import path from 'path';
import { RenameResult, DocumentType } from '@shared/types';
import { APP_CONFIG } from '@shared/constants/config';
import { Logger } from '../utils/logger';

export interface RenameOptions {
  fileId: string;
  oldPath: string;
  newName: string;
  targetFolder: string;
  createSubfolders?: boolean;
  backup?: boolean;
}

export interface BatchRenameOperation {
  fileId: string;
  oldPath: string;
  newName: string;
  targetFolder: string;
  documentType?: DocumentType;
}

export class FileRenamer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('FileRenamer');
  }

  async renameFile(options: RenameOptions): Promise<RenameResult> {
    const { oldPath, newName, targetFolder, createSubfolders = true, backup = true } = options;

    this.logger.info(`Renaming file: ${oldPath} -> ${newName}`);

    try {
      // 入力検証
      await this.validateInputs(oldPath, newName, targetFolder);

      // ターゲットフォルダの作成
      if (createSubfolders) {
        await this.ensureTargetFolder(targetFolder, newName);
      }

      // 新しいファイルパスの生成
      const newPath = path.join(targetFolder, this.getCategoryFolder(newName), newName);

      // 重複チェック
      await this.checkDuplicates(newPath);

      // バックアップの作成
      let backupPath: string | undefined;
      if (backup) {
        backupPath = await this.createBackup(oldPath);
      }

      // ファイルの移動とリネーム
      await fs.move(oldPath, newPath, { overwrite: false });

      this.logger.info(`File renamed successfully: ${newPath}`);

      return {
        oldPath,
        newPath,
        backupPath,
        success: true
      };

    } catch (error) {
      this.logger.error(`Error renaming file ${oldPath}:`, error);
      return {
        oldPath,
        newPath: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async batchRename(operations: BatchRenameOperation[]): Promise<RenameResult[]> {
    this.logger.info(`Starting batch rename for ${operations.length} files`);

    const results: RenameResult[] = [];

    for (const operation of operations) {
      const result = await this.renameFile({
        fileId: operation.fileId,
        oldPath: operation.oldPath,
        newName: operation.newName,
        targetFolder: operation.targetFolder,
        createSubfolders: true,
        backup: true
      });

      results.push(result);

      // エラーが発生しても続行
      if (!result.success) {
        this.logger.warn(`Failed to rename ${operation.oldPath}, continuing with next file`);
      }
    }

    const successCount = results.filter(r => r.success).length;
    this.logger.info(`Batch rename completed: ${successCount}/${operations.length} successful`);

    return results;
  }

  private async validateInputs(oldPath: string, newName: string, targetFolder: string) {
    // ファイルの存在確認
    if (!await fs.pathExists(oldPath)) {
      throw new Error(`Source file not found: ${oldPath}`);
    }

    // ファイル名の検証
    if (!this.isValidFileName(newName)) {
      throw new Error(`Invalid file name: ${newName}`);
    }

    // パストラバーサル攻撃の防止
    const normalizedTarget = path.normalize(targetFolder);
    if (normalizedTarget.includes('..')) {
      throw new Error('Invalid target folder path');
    }
  }

  private isValidFileName(fileName: string): boolean {
    // Windowsで使用できない文字をチェック
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(fileName)) {
      return false;
    }

    // ファイル名の長さチェック
    if (fileName.length > 255) {
      return false;
    }

    // 拡張子の確認
    const ext = path.extname(fileName).toLowerCase();
    if (!APP_CONFIG.FILE_TYPES.SUPPORTED.includes(ext)) {
      return false;
    }

    return true;
  }

  private async ensureTargetFolder(baseFolder: string, fileName: string) {
    const categoryFolder = this.getCategoryFolder(fileName);
    const fullPath = path.join(baseFolder, categoryFolder);

    if (!await fs.pathExists(fullPath)) {
      await fs.ensureDir(fullPath);
      this.logger.info(`Created directory: ${fullPath}`);
    }
  }

  private getCategoryFolder(fileName: string): string {
    // ファイル名の先頭4桁から番台を判定
    const prefix = fileName.substring(0, 4);
    const prefixNum = parseInt(prefix, 10);

    if (isNaN(prefixNum)) {
      return 'その他';
    }

    // 番台に応じたフォルダ名を返す
    if (prefixNum < 1000) return '0000番台_法人税';
    if (prefixNum < 2000) return '1000番台_都道府県税';
    if (prefixNum < 3000) return '2000番台_市民税';
    if (prefixNum < 4000) return '3000番台_消費税';
    if (prefixNum < 5000) return '4000番台_事業所税';
    if (prefixNum < 6000) return '5000番台_決算書類';
    if (prefixNum < 7000) return '6000番台_固定資産';
    if (prefixNum < 8000) return '7000番台_税区分集計表';
    
    return 'その他';
  }

  private async checkDuplicates(newPath: string) {
    if (await fs.pathExists(newPath)) {
      // 重複時は連番を付与
      const dir = path.dirname(newPath);
      const ext = path.extname(newPath);
      const baseName = path.basename(newPath, ext);
      
      let counter = 1;
      let uniquePath = newPath;
      
      while (await fs.pathExists(uniquePath)) {
        uniquePath = path.join(dir, `${baseName}_(${counter})${ext}`);
        counter++;
      }
      
      this.logger.warn(`File already exists, using: ${uniquePath}`);
      return uniquePath;
    }
    
    return newPath;
  }

  private async createBackup(filePath: string): Promise<string> {
    const backupDir = path.join(path.dirname(filePath), '.backup');
    await fs.ensureDir(backupDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, `${timestamp}_${fileName}`);

    await fs.copy(filePath, backupPath);
    this.logger.info(`Backup created: ${backupPath}`);

    return backupPath;
  }

  async restoreFromBackup(backupPath: string, originalPath: string): Promise<void> {
    if (!await fs.pathExists(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    await fs.copy(backupPath, originalPath, { overwrite: true });
    this.logger.info(`File restored from backup: ${originalPath}`);
  }

  generateSuggestedName(
    documentType: DocumentType,
    companyName?: string,
    fiscalYear?: string,
    prefecture?: string
  ): string {
    let prefix = '9999';
    let documentName = '不明な書類';

    // 書類種別に応じたプレフィックスと名前を設定
    switch (documentType) {
      case DocumentType.CORPORATE_TAX:
        prefix = '0001';
        documentName = '法人税及び地方法人税申告書';
        break;
      case DocumentType.CONSUMPTION_TAX:
        prefix = '3001';
        documentName = '消費税及び地方消費税申告書';
        break;
      case DocumentType.PREFECTURAL_TAX:
        if (prefecture) {
          const prefectureConfig = APP_CONFIG.RENAME_PATTERNS.PREFECTURAL_TAX.prefixes;
          prefix = prefectureConfig[prefecture] || '1000';
          documentName = `${prefecture}_法人都道府県民税事業税`;
        }
        break;
      case DocumentType.MUNICIPAL_TAX:
        if (prefecture) {
          const municipalConfig = APP_CONFIG.RENAME_PATTERNS.MUNICIPAL_TAX.prefixes;
          prefix = municipalConfig[prefecture] || '2000';
          documentName = `${prefecture}_法人市民税`;
        }
        break;
      case DocumentType.RECEIPT_NOTICE:
        prefix = '0003';
        documentName = '受信通知';
        break;
      case DocumentType.PAYMENT_INFO:
        prefix = '0004';
        documentName = '納付情報';
        break;
      case DocumentType.FINANCIAL_STATEMENT:
        prefix = '5001';
        documentName = '決算書';
        break;
      case DocumentType.FIXED_ASSET:
        prefix = '6001';
        documentName = '固定資産台帳';
        break;
      case DocumentType.TAX_CLASSIFICATION:
        prefix = '7001';
        documentName = '税区分集計表';
        break;
    }

    // 決算期が指定されていない場合はXXXXを使用
    const period = fiscalYear || 'XXXX';

    return `${prefix}_${documentName}_${period}.pdf`;
  }
}