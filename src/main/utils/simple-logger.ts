import path from 'path';
import fs from 'fs-extra';

const isDev = process.env.NODE_ENV === 'development';

// ログディレクトリの作成
const logDir = isDev 
  ? path.join(process.cwd(), 'logs')
  : path.join(process.env.APPDATA || process.env.HOME || '', '.tax-filenamechanger', 'logs');

// シンプルなログ関数（EventLogInternalエラー回避）
function writeLogSync(level: string, message: string, context?: string, metadata?: any) {
  try {
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(logDir)) {
      fs.ensureDirSync(logDir);
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let logMessage = `${timestamp} [${level.toUpperCase()}]`;
    
    if (context) {
      logMessage += ` [${context}]`;
    }
    
    logMessage += ` ${message}`;
    
    if (metadata && typeof metadata === 'object') {
      try {
        logMessage += ` ${JSON.stringify(metadata)}`;
      } catch {
        logMessage += ` [metadata serialization failed]`;
      }
    }
    
    logMessage += '\n';
    
    // 開発環境ではコンソール出力
    if (isDev) {
      console.log(logMessage.trim());
    }
    
    // ファイル出力（同期で安全に書き込み）
    const logFile = path.join(logDir, 'app.log');
    fs.appendFileSync(logFile, logMessage, { encoding: 'utf8' });
    
    // エラーレベルは別ファイルにも保存
    if (level === 'error') {
      const errorFile = path.join(logDir, 'error.log');
      fs.appendFileSync(errorFile, logMessage, { encoding: 'utf8' });
    }
  } catch (error) {
    // ログ書き込みエラーは無視（エラーループ防止）
    if (isDev) {
      console.error('Failed to write log:', error);
    }
  }
}

export class SimpleLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, metadata?: any) {
    writeLogSync('info', message, this.context, metadata);
  }

  warn(message: string, metadata?: any) {
    writeLogSync('warn', message, this.context, metadata);
  }

  error(message: string, error?: any, metadata?: any) {
    const errorData = error instanceof Error 
      ? { error: error.message, stack: error.stack }
      : error ? { error: error.toString() } : {};
    
    writeLogSync('error', message, this.context, { ...errorData, ...metadata });
  }

  debug(message: string, metadata?: any) {
    if (isDev) {
      writeLogSync('debug', message, this.context, metadata);
    }
  }

  static getLogPath(): string {
    return logDir;
  }

  static async clearLogs(): Promise<void> {
    try {
      if (fs.existsSync(logDir)) {
        const files = await fs.readdir(logDir);
        for (const file of files) {
          if (file.endsWith('.log')) {
            await fs.remove(path.join(logDir, file));
          }
        }
      }
    } catch (error) {
      // ログクリア失敗時は無視
    }
  }
}