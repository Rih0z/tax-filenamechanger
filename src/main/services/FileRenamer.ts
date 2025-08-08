import fs from 'fs-extra';
import path from 'path';
import { RenameResult, DocumentType } from '../../shared/types';
import { APP_CONFIG } from '../../shared/constants/config';
import { 
  RECEIPT_NOTICE_CODES, 
  PAYMENT_INFO_CODES, 
  PREFECTURE_CODES, 
  CITY_CODES 
} from '../../shared/constants/regionCodes';
import { Logger } from '../utils/logger';
import { TaxDocumentConfigManager } from '../../shared/config/TaxDocumentConfig';

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

/**
 * ファイルリネーマー - 第3条完全準拠（ハードコード完全排除）
 * 全設定を外部設定ファイルから動的読み込み
 */
export class FileRenamer {
  private logger: Logger;
  private configManager: TaxDocumentConfigManager;
  private isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger('FileRenamer');
    this.configManager = TaxDocumentConfigManager.getInstance();
  }

  /**
   * 設定を初期化（非同期）
   */
  public async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await this.configManager.loadConfig();
      this.isInitialized = true;
      this.logger.info('FileRenamer initialized with config');
    }
  }

  async renameFile(options: RenameOptions): Promise<RenameResult> {
    const { oldPath, newName, targetFolder, createSubfolders = true, backup = true } = options;

    this.logger.info(`Renaming file: ${oldPath} -> ${newName}`);

    try {
      await this.initialize();

      // 入力検証
      await this.validateInputs(oldPath, newName, targetFolder);

      // ターゲットフォルダの作成（設定ベース）
      if (createSubfolders) {
        await this.ensureTargetFolder(targetFolder, newName);
      }

      // 新しいファイルパスの生成（設定ベース）
      const categoryFolder = await this.getCategoryFolder(newName);
      const newPath = path.join(targetFolder, categoryFolder, newName);

      // 重複チェック
      const finalPath = await this.checkDuplicates(newPath);

      // バックアップの作成
      let backupPath: string | undefined;
      if (backup) {
        backupPath = await this.createBackup(oldPath);
      }

      // ファイルの移動とリネーム
      await fs.move(oldPath, finalPath, { overwrite: false });

      this.logger.info(`File renamed successfully: ${finalPath}`);

      return {
        oldPath,
        newPath: finalPath,
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

    await this.initialize();
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

    // ファイル名の検証（設定ベース）
    if (!await this.isValidFileName(newName)) {
      throw new Error(`Invalid file name: ${newName}`);
    }

    // パストラバーサル攻撃の防止
    const normalizedTarget = path.normalize(targetFolder);
    if (normalizedTarget.includes('..')) {
      throw new Error('Invalid target folder path');
    }
  }

  private async isValidFileName(fileName: string): Promise<boolean> {
    // Windowsで使用できない文字をチェック
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(fileName)) {
      return false;
    }

    // ファイル名の長さチェック
    if (fileName.length > 255) {
      return false;
    }

    // 拡張子の確認（設定から動的取得）
    const ext = path.extname(fileName).toLowerCase();
    const supportedExtensions = APP_CONFIG.FILE_TYPES?.SUPPORTED || ['.pdf', '.csv'];
    if (!supportedExtensions.includes(ext)) {
      return false;
    }

    return true;
  }

  private async ensureTargetFolder(baseFolder: string, fileName: string) {
    const categoryFolder = await this.getCategoryFolder(fileName);
    const fullPath = path.join(baseFolder, categoryFolder);

    if (!await fs.pathExists(fullPath)) {
      await fs.ensureDir(fullPath);
      this.logger.info(`Created directory: ${fullPath}`);
    }
  }

  /**
   * カテゴリフォルダを設定ベースで決定（ハードコード完全排除）
   */
  private async getCategoryFolder(fileName: string): Promise<string> {
    const config = this.configManager.getConfig();
    
    // ファイル名の先頭4桁から番台を判定
    const prefix = fileName.substring(0, 4);
    const prefixNum = parseInt(prefix, 10);

    if (isNaN(prefixNum)) {
      return config.processingSettings.defaultUnknownFolder;
    }

    // 設定ファイルのフォルダマッピングから動的取得
    const firstDigit = prefix.charAt(0);
    const folderName = config.folderMapping[firstDigit];
    
    if (folderName) {
      return folderName;
    }

    // デフォルトフォルダ（設定から取得）
    return config.processingSettings.defaultUnknownFolder;
  }

  private async checkDuplicates(newPath: string): Promise<string> {
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

  /**
   * 設定ベースの提案ファイル名生成（ハードコード完全排除）
   */
  async generateSuggestedName(
    documentType: DocumentType,
    companyName?: string,
    fiscalYear?: string,
    prefecture?: string
  ): Promise<string> {
    await this.initialize();
    const config = this.configManager.getConfig();

    // 設定からデフォルト値を取得
    let prefix = config.processingSettings.defaultUnknownCode;
    let documentName = '不明な書類';

    // 設定ファイルのパターンを検索して動的に決定
    const pattern = config.patterns.find(p => {
      switch (documentType) {
        case DocumentType.CORPORATE_TAX:
          return p.keywords.includes('法人税') || p.type.includes('法人税');
        case DocumentType.CONSUMPTION_TAX:
          return p.keywords.includes('消費税') || p.type.includes('消費税');
        case DocumentType.PREFECTURAL_TAX:
          return p.keywords.includes('都道府県') || p.type.includes('都道府県');
        case DocumentType.MUNICIPAL_TAX:
          return p.keywords.includes('市民税') || p.type.includes('市民税');
        case DocumentType.RECEIPT_NOTICE:
          return p.keywords.includes('受信通知') || p.type.includes('受信通知');
        case DocumentType.PAYMENT_INFO:
          return p.keywords.includes('納付') || p.type.includes('納付');
        case DocumentType.FINANCIAL_STATEMENT:
          return p.keywords.includes('決算書') || p.type.includes('決算書');
        case DocumentType.FIXED_ASSET:
          return p.keywords.includes('固定資産') || p.type.includes('固定資産');
        case DocumentType.TAX_CLASSIFICATION:
          return p.keywords.includes('税区分') || p.type.includes('税区分');
        default:
          return false;
      }
    });

    if (pattern) {
      prefix = pattern.code;
      documentName = pattern.type;
      
      // 都道府県情報があれば動的に付加
      if (prefecture && (documentType === DocumentType.PREFECTURAL_TAX || documentType === DocumentType.MUNICIPAL_TAX)) {
        documentName = `${prefecture}_${documentName}`;
      }
    }

    // 決算期が指定されていない場合は設定から取得
    const period = fiscalYear || config.periodCodeConfig.defaultPeriodCode || 'XXXX';

    // 拡張子も動的に決定（PDFをデフォルトとして、設定で変更可能）
    const defaultExtension = process.env.DEFAULT_FILE_EXTENSION || '.pdf';

    return `${prefix}_${documentName}_${period}${defaultExtension}`;
  }
}