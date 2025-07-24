// ファイル関連の型定義
export interface FileInfo {
  id: string;
  path: string;
  name: string;
  size: number;
  extension: string;
  createdAt: string;
  modifiedAt: string;
  isProcessed: boolean;
}

// 書類種別
export enum DocumentType {
  CORPORATE_TAX = '法人税申告書',
  CONSUMPTION_TAX = '消費税申告書',
  PREFECTURAL_TAX = '都道府県税申告書',
  MUNICIPAL_TAX = '市民税申告書',
  RECEIPT_NOTICE = '受信通知',
  PAYMENT_INFO = '納付情報',
  FINANCIAL_STATEMENT = '決算書',
  FIXED_ASSET = '固定資産',
  TAX_CLASSIFICATION = '税区分集計表',
  UNKNOWN = '不明'
}

// PDF解析結果
export interface ParsedDocument {
  originalName: string;
  extractedText: string;
  metadata: {
    title?: string;
    author?: string;
    creationDate?: string;
  };
  analysis: {
    documentType: DocumentType;
    companyName?: string;
    fiscalYear?: string;
    submissionDate?: string;
    confidence: number;
  };
  suggestedName: string;
}

// リネーム結果
export interface RenameResult {
  oldPath: string;
  newPath: string;
  backupPath?: string;
  success: boolean;
  error?: string;
}

// クライアント情報
export interface Client {
  id: string;
  name: string;
  corporateNumber?: string;
  fiscalYearEnd: string;
  outputFolder: string;
  createdAt: string;
  updatedAt: string;
}

// アプリケーション設定
export interface AppSettings {
  app: {
    theme: 'light' | 'dark' | 'system';
    language: 'ja' | 'en';
    autoStart: boolean;
    minimizeToTray: boolean;
  };
  watcher: {
    folders: string[];
    fileTypes: string[];
    pollInterval: number;
    autoProcess: boolean;
  };
  rename: {
    backupEnabled: boolean;
    preserveOriginalDate: boolean;
  };
  notification: {
    enabled: boolean;
    sound: boolean;
    showProgress: boolean;
  };
}

// リネームルール
export interface RenameRule {
  id: string;
  name: string;
  pattern: string;
  documentType: DocumentType;
  prefix: string;
  category: string;
  priority: number;
  active: boolean;
}

// 処理履歴
export interface ProcessingHistory {
  id: string;
  clientId: string;
  clientName: string;
  processedAt: string;
  totalFiles: number;
  successCount: number;
  failureCount: number;
  files: ProcessedFileInfo[];
}

export interface ProcessedFileInfo {
  originalName: string;
  newName: string;
  documentType: DocumentType;
  status: 'success' | 'failed';
  error?: string;
}

// API共通レスポンス
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}