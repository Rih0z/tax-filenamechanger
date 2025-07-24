import winston from 'winston';
import path from 'path';
import fs from 'fs-extra';
import { APP_CONFIG } from '@shared/constants/config';

const isDev = process.env.NODE_ENV === 'development';

// ログディレクトリの作成
const logDir = isDev 
  ? path.join(process.cwd(), 'logs')
  : path.join(process.env.APPDATA || process.env.HOME || '', '.tax-filenamechanger', 'logs');

fs.ensureDirSync(logDir);

// カスタムフォーマット
const customFormat = winston.format.printf(({ timestamp, level, message, context, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}]`;
  if (context) {
    msg += ` [${context}]`;
  }
  msg += ` ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Winstonロガーの設定
const winstonLogger = winston.createLogger({
  level: APP_CONFIG.LOGGING.LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    customFormat
  ),
  transports: [
    // ファイル出力（エラー）
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    // ファイル出力（全般）
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: APP_CONFIG.LOGGING.MAX_FILES
    })
  ]
});

// 開発環境ではコンソールにも出力
if (isDev) {
  winstonLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// ロガークラス
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, metadata?: any) {
    winstonLogger.info(message, { context: this.context, ...metadata });
  }

  warn(message: string, metadata?: any) {
    winstonLogger.warn(message, { context: this.context, ...metadata });
  }

  error(message: string, error?: any, metadata?: any) {
    const errorData = error instanceof Error 
      ? { error: error.message, stack: error.stack }
      : error ? { error } : {};
    
    winstonLogger.error(message, { 
      context: this.context, 
      ...errorData,
      ...metadata 
    });
  }

  debug(message: string, metadata?: any) {
    winstonLogger.debug(message, { context: this.context, ...metadata });
  }

  // ログファイルのパスを取得
  static getLogPath(): string {
    return logDir;
  }

  // ログファイルをクリア
  static async clearLogs(): Promise<void> {
    const files = await fs.readdir(logDir);
    for (const file of files) {
      if (file.endsWith('.log')) {
        await fs.remove(path.join(logDir, file));
      }
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