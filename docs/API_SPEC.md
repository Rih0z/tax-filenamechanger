# API仕様書 - IPC通信インターフェース

## 1. 概要

本ドキュメントは、Electronアプリケーションのメインプロセスとレンダラープロセス間のIPC（Inter-Process Communication）APIの仕様を定義します。

### 1.1 命名規則

- チャンネル名: `{domain}:{action}` 形式
- リクエスト/レスポンス: TypeScriptインターフェースで型定義
- エラーレスポンス: 統一されたエラー形式

### 1.2 共通レスポンス形式

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}
```

## 2. ファイル操作API

### 2.1 ファイルスキャン

新しいファイルをスキャンして一覧を取得します。

**チャンネル名**: `file:scan`

**リクエスト**:
```typescript
interface ScanFilesRequest {
  folders: string[];        // スキャン対象フォルダ
  fileTypes?: string[];     // 対象ファイル拡張子 (デフォルト: ['.pdf', '.csv'])
  recursive?: boolean;      // サブフォルダも含めるか
}
```

**レスポンス**:
```typescript
interface ScanFilesResponse {
  files: FileInfo[];
}

interface FileInfo {
  id: string;              // 一意のファイルID
  path: string;            // ファイルフルパス
  name: string;            // ファイル名
  size: number;            // ファイルサイズ（バイト）
  extension: string;       // 拡張子
  createdAt: string;       // 作成日時（ISO 8601）
  modifiedAt: string;      // 更新日時（ISO 8601）
  isProcessed: boolean;    // 処理済みフラグ
}
```

### 2.2 PDF解析

PDFファイルの内容を解析して税務書類情報を抽出します。

**チャンネル名**: `file:parse-pdf`

**リクエスト**:
```typescript
interface ParsePDFRequest {
  filePath: string;        // PDFファイルパス
  options?: {
    extractText: boolean;  // テキスト抽出（デフォルト: true）
    extractMetadata: boolean; // メタデータ抽出（デフォルト: true）
  };
}
```

**レスポンス**:
```typescript
interface ParsePDFResponse {
  document: ParsedDocument;
}

interface ParsedDocument {
  originalName: string;          // 元のファイル名
  extractedText: string;         // 抽出されたテキスト
  metadata: {
    title?: string;
    author?: string;
    creationDate?: string;
  };
  analysis: {
    documentType: DocumentType;   // 書類種別
    companyName?: string;         // 会社名
    fiscalYear?: string;          // 事業年度
    submissionDate?: string;      // 提出日
    confidence: number;           // 解析信頼度（0-1）
  };
  suggestedName: string;         // 推奨ファイル名
}

enum DocumentType {
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
```

### 2.3 ファイルリネーム

ファイルをリネームして指定フォルダに移動します。

**チャンネル名**: `file:rename`

**リクエスト**:
```typescript
interface RenameFileRequest {
  fileId: string;          // ファイルID
  newName: string;         // 新しいファイル名
  targetFolder: string;    // 移動先フォルダ
  createSubfolders?: boolean; // サブフォルダを自動作成
  backup?: boolean;        // バックアップを作成（デフォルト: true）
}
```

**レスポンス**:
```typescript
interface RenameFileResponse {
  oldPath: string;         // 元のファイルパス
  newPath: string;         // 新しいファイルパス
  backupPath?: string;     // バックアップパス（作成した場合）
}
```

### 2.4 一括処理

複数ファイルを一括でリネーム・移動します。

**チャンネル名**: `file:batch-process`

**リクエスト**:
```typescript
interface BatchProcessRequest {
  operations: FileOperation[];
  options: {
    stopOnError?: boolean;      // エラー時に停止（デフォルト: false）
    createBackup?: boolean;     // バックアップ作成（デフォルト: true）
    reportProgress?: boolean;   // 進捗報告（デフォルト: true）
  };
}

interface FileOperation {
  fileId: string;
  newName: string;
  targetFolder: string;
}
```

**レスポンス**:
```typescript
interface BatchProcessResponse {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  results: ProcessResult[];
}

interface ProcessResult {
  fileId: string;
  success: boolean;
  oldPath?: string;
  newPath?: string;
  error?: string;
}
```

## 3. 設定管理API

### 3.1 設定取得

アプリケーション設定を取得します。

**チャンネル名**: `settings:get`

**リクエスト**:
```typescript
interface GetSettingsRequest {
  keys?: string[];         // 特定のキーのみ取得（省略時は全設定）
}
```

**レスポンス**:
```typescript
interface GetSettingsResponse {
  settings: AppSettings;
}

interface AppSettings {
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
    defaultRules: RenameRule[];
    backupEnabled: boolean;
    preserveOriginalDate: boolean;
  };
  notification: {
    enabled: boolean;
    sound: boolean;
    showProgress: boolean;
  };
}
```

### 3.2 設定更新

アプリケーション設定を更新します。

**チャンネル名**: `settings:update`

**リクエスト**:
```typescript
interface UpdateSettingsRequest {
  settings: Partial<AppSettings>;
}
```

**レスポンス**:
```typescript
interface UpdateSettingsResponse {
  updated: boolean;
  settings: AppSettings;
}
```

## 4. クライアント管理API

### 4.1 クライアント一覧取得

登録されているクライアント一覧を取得します。

**チャンネル名**: `client:list`

**リクエスト**:
```typescript
interface ListClientsRequest {
  page?: number;           // ページ番号（デフォルト: 1）
  limit?: number;          // 件数（デフォルト: 50）
  search?: string;         // 検索文字列
  sortBy?: 'name' | 'createdAt' | 'fiscalYearEnd';
  sortOrder?: 'asc' | 'desc';
}
```

**レスポンス**:
```typescript
interface ListClientsResponse {
  clients: Client[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface Client {
  id: string;
  name: string;
  corporateNumber?: string;    // 法人番号
  fiscalYearEnd: string;       // 決算期（YYMM形式）
  outputFolder: string;        // 出力先フォルダ
  settings?: ClientSettings;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 クライアント追加

新しいクライアントを追加します。

**チャンネル名**: `client:create`

**リクエスト**:
```typescript
interface CreateClientRequest {
  name: string;
  corporateNumber?: string;
  fiscalYearEnd: string;
  outputFolder: string;
  settings?: ClientSettings;
}
```

**レスポンス**:
```typescript
interface CreateClientResponse {
  client: Client;
}
```

### 4.3 クライアント更新

既存のクライアント情報を更新します。

**チャンネル名**: `client:update`

**リクエスト**:
```typescript
interface UpdateClientRequest {
  id: string;
  updates: Partial<CreateClientRequest>;
}
```

**レスポンス**:
```typescript
interface UpdateClientResponse {
  client: Client;
}
```

## 5. リネームルールAPI

### 5.1 ルール一覧取得

リネームルールの一覧を取得します。

**チャンネル名**: `rule:list`

**リクエスト**:
```typescript
interface ListRulesRequest {
  category?: string;       // カテゴリでフィルタ
  active?: boolean;        // 有効なルールのみ
}
```

**レスポンス**:
```typescript
interface ListRulesResponse {
  rules: RenameRule[];
}

interface RenameRule {
  id: string;
  name: string;
  pattern: string;         // 正規表現パターン
  documentType: DocumentType;
  prefix: string;          // ファイル名プレフィックス（例: "0001"）
  category: string;        // カテゴリ（例: "法人税"）
  priority: number;        // 優先度（高い値が優先）
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 5.2 ルール追加

新しいリネームルールを追加します。

**チャンネル名**: `rule:create`

**リクエスト**:
```typescript
interface CreateRuleRequest {
  name: string;
  pattern: string;
  documentType: DocumentType;
  prefix: string;
  category: string;
  priority?: number;
  active?: boolean;
}
```

**レスポンス**:
```typescript
interface CreateRuleResponse {
  rule: RenameRule;
}
```

## 6. 処理履歴API

### 6.1 履歴取得

ファイル処理履歴を取得します。

**チャンネル名**: `history:list`

**リクエスト**:
```typescript
interface ListHistoryRequest {
  clientId?: string;       // クライアントでフィルタ
  dateFrom?: string;       // 開始日（ISO 8601）
  dateTo?: string;         // 終了日（ISO 8601）
  page?: number;
  limit?: number;
}
```

**レスポンス**:
```typescript
interface ListHistoryResponse {
  history: ProcessingHistory[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface ProcessingHistory {
  id: string;
  clientId: string;
  clientName: string;
  processedAt: string;
  totalFiles: number;
  successCount: number;
  failureCount: number;
  files: ProcessedFileInfo[];
}

interface ProcessedFileInfo {
  originalName: string;
  newName: string;
  documentType: DocumentType;
  status: 'success' | 'failed';
  error?: string;
}
```

### 6.2 履歴エクスポート

処理履歴をCSV形式でエクスポートします。

**チャンネル名**: `history:export`

**リクエスト**:
```typescript
interface ExportHistoryRequest {
  format: 'csv' | 'xlsx';
  filters: {
    clientId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}
```

**レスポンス**:
```typescript
interface ExportHistoryResponse {
  filePath: string;        // エクスポートファイルのパス
  recordCount: number;     // エクスポートされたレコード数
}
```

## 7. システムAPI

### 7.1 アプリケーション情報

アプリケーションの情報を取得します。

**チャンネル名**: `system:info`

**リクエスト**: なし

**レスポンス**:
```typescript
interface SystemInfoResponse {
  version: string;
  platform: 'win32' | 'darwin' | 'linux';
  arch: string;
  electron: string;
  node: string;
  chrome: string;
  uptime: number;          // 起動時間（秒）
}
```

### 7.2 ログ取得

アプリケーションログを取得します。

**チャンネル名**: `system:logs`

**リクエスト**:
```typescript
interface GetLogsRequest {
  level?: 'error' | 'warn' | 'info' | 'debug';
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}
```

**レスポンス**:
```typescript
interface GetLogsResponse {
  logs: LogEntry[];
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  details?: any;
}
```

## 8. エラーコード一覧

| コード | 説明 | HTTPステータス相当 |
|--------|------|-------------------|
| FILE_NOT_FOUND | ファイルが見つかりません | 404 |
| FILE_ACCESS_DENIED | ファイルアクセス権限がありません | 403 |
| FILE_ALREADY_EXISTS | ファイルが既に存在します | 409 |
| INVALID_FILE_FORMAT | サポートされていないファイル形式です | 415 |
| PDF_PARSE_ERROR | PDF解析エラー | 422 |
| VALIDATION_ERROR | 入力値が不正です | 400 |
| DATABASE_ERROR | データベースエラー | 500 |
| UNKNOWN_ERROR | 不明なエラー | 500 |

## 9. イベント通知

### 9.1 ファイル検出イベント

**イベント名**: `file:detected`

**ペイロード**:
```typescript
interface FileDetectedEvent {
  file: FileInfo;
  timestamp: string;
}
```

### 9.2 処理進捗イベント

**イベント名**: `process:progress`

**ペイロード**:
```typescript
interface ProcessProgressEvent {
  taskId: string;
  current: number;
  total: number;
  percentage: number;
  message: string;
}
```

### 9.3 エラーイベント

**イベント名**: `error:occurred`

**ペイロード**:
```typescript
interface ErrorEvent {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}
```