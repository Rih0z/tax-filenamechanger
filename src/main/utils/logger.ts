import path from 'path';
import fs from 'fs-extra';

const isDev = process.env.NODE_ENV === 'development';

// ログディレクトリの作成
const logDir = isDev 
  ? path.join(process.cwd(), 'logs')
  : path.join(process.env.APPDATA || process.env.HOME || '', '.tax-filenamechanger', 'logs');

try {
  fs.ensureDirSync(logDir);
} catch (error) {
  // ログディレクトリ作成失敗時は無視
}

// シンプルなログ書き込み関数
function writeLog(level: string, message: string, context?: string, metadata?: any) {
  try {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let logMessage = `${timestamp} [${level.toUpperCase()}]`;
    
    if (context) {
      logMessage += ` [${context}]`;
    }
    
    logMessage += ` ${message}`;
    
    if (metadata && Object.keys(metadata).length > 0) {
      logMessage += ` ${JSON.stringify(metadata)}`;
    }
    
    logMessage += '\n';
    
    // コンソール出力
    if (isDev) {
      console.log(logMessage.trim());
    }
    
    // ファイル出力（同期処理でエラー回避）
    const logFile = path.join(logDir, 'app.log');
    fs.appendFileSync(logFile, logMessage);
    
    // エラーレベルの場合は別途エラーログにも出力
    if (level === 'error') {
      const errorFile = path.join(logDir, 'error.log');
      fs.appendFileSync(errorFile, logMessage);
    }
  } catch (error) {
    // ログ書き込み失敗時は無視（エラーループ防止）
  }
}

// ロガークラス
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, metadata?: any) {
    writeLog('info', message, this.context, metadata);
  }

  warn(message: string, metadata?: any) {
    writeLog('warn', message, this.context, metadata);
  }

  error(message: string, error?: any, metadata?: any) {
    const errorData = error instanceof Error 
      ? { error: error.message, stack: error.stack }
      : error ? { error } : {};
    
    writeLog('error', message, this.context, { ...errorData, ...metadata });
  }

  debug(message: string, metadata?: any) {
    if (isDev) {
      writeLog('debug', message, this.context, metadata);
    }
  }

  // ログファイルのパスを取得
  static getLogPath(): string {
    return logDir;
  }

  // ログファイルをクリア
  static async clearLogs(): Promise<void> {
    try {
      const files = await fs.readdir(logDir);
      for (const file of files) {
        if (file.endsWith('.log')) {
          await fs.remove(path.join(logDir, file));
        }
      }
    } catch (error) {
      // ログクリア失敗時は無視
    }
  }

  // 最近のログを取得
  static async getRecentLogs(lines: number = 100): Promise<string[]> {
    const logFile = path.join(logDir, 'app.log');
    
    try {
      const content = await fs.readFile(logFile, 'utf-8');
      const allLines = content.split('\n').filter(line => line.trim());
      return allLines.slice(-lines);
    } catch (error) {
      return [];
    }
  }
}