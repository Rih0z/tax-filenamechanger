import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { Client, ProcessingHistory, ProcessedFileInfo } from '@shared/types';
import { APP_CONFIG } from '@shared/constants/config';
import { Logger } from '../utils/logger';

export class DatabaseService {
  private db: Database.Database | null = null;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('Database');
  }

  async initialize() {
    try {
      const dbPath = APP_CONFIG.DATABASE.PATH;
      const dbDir = path.dirname(dbPath);
      
      // データベースディレクトリの作成
      await fs.ensureDir(dbDir);
      
      // データベース接続
      this.db = new Database(dbPath);
      this.logger.info(`Database connected: ${dbPath}`);
      
      // テーブルの作成
      await this.createTables();
      
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    // クライアントテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        corporate_number TEXT,
        fiscal_year_end TEXT NOT NULL,
        output_folder TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // 処理済みファイルテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS processed_files (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        original_name TEXT NOT NULL,
        new_name TEXT NOT NULL,
        document_type TEXT NOT NULL,
        client_id TEXT,
        processed_at TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      )
    `);

    // 処理履歴テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS processing_history (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        processed_at TEXT NOT NULL,
        total_files INTEGER NOT NULL,
        success_count INTEGER NOT NULL,
        failure_count INTEGER NOT NULL,
        details TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      )
    `);

    // 設定テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    this.logger.info('Database tables created');
  }

  // クライアント関連のメソッド
  async createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    if (!this.db) throw new Error('Database not initialized');

    const id = this.generateId();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO clients (id, name, corporate_number, fiscal_year_end, output_folder, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      client.name,
      client.corporateNumber || null,
      client.fiscalYearEnd,
      client.outputFolder,
      now,
      now
    );

    return {
      id,
      ...client,
      createdAt: now,
      updatedAt: now
    };
  }

  async getClients(): Promise<Client[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT * FROM clients ORDER BY name
    `);

    return stmt.all().map(row => ({
      id: row.id,
      name: row.name,
      corporateNumber: row.corporate_number,
      fiscalYearEnd: row.fiscal_year_end,
      outputFolder: row.output_folder,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    if (!this.db) throw new Error('Database not initialized');

    const current = await this.getClientById(id);
    if (!current) throw new Error('Client not found');

    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };

    const stmt = this.db.prepare(`
      UPDATE clients 
      SET name = ?, corporate_number = ?, fiscal_year_end = ?, output_folder = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.corporateNumber || null,
      updated.fiscalYearEnd,
      updated.outputFolder,
      updated.updatedAt,
      id
    );

    return updated;
  }

  async getClientById(id: string): Promise<Client | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM clients WHERE id = ?');
    const row = stmt.get(id);

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      corporateNumber: row.corporate_number,
      fiscalYearEnd: row.fiscal_year_end,
      outputFolder: row.output_folder,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // 処理済みファイル関連のメソッド
  async recordProcessedFile(fileInfo: {
    path: string;
    originalName: string;
    newName: string;
    documentType: string;
    clientId?: string;
  }) {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO processed_files (id, path, original_name, new_name, document_type, client_id, processed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      this.generateId(),
      fileInfo.path,
      fileInfo.originalName,
      fileInfo.newName,
      fileInfo.documentType,
      fileInfo.clientId || null,
      new Date().toISOString()
    );
  }

  async getProcessedFiles(): Promise<{ path: string; processedAt: string }[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT path, processed_at FROM processed_files');
    return stmt.all().map(row => ({
      path: row.path,
      processedAt: row.processed_at
    }));
  }

  // 処理履歴関連のメソッド
  async recordProcessingHistory(history: {
    clientId: string;
    totalFiles: number;
    successCount: number;
    failureCount: number;
    files: ProcessedFileInfo[];
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO processing_history (id, client_id, processed_at, total_files, success_count, failure_count, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      this.generateId(),
      history.clientId,
      new Date().toISOString(),
      history.totalFiles,
      history.successCount,
      history.failureCount,
      JSON.stringify(history.files)
    );
  }

  async getProcessingHistory(clientId?: string): Promise<ProcessingHistory[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = `
      SELECT h.*, c.name as client_name 
      FROM processing_history h
      JOIN clients c ON h.client_id = c.id
    `;

    if (clientId) {
      query += ' WHERE h.client_id = ?';
    }

    query += ' ORDER BY h.processed_at DESC';

    const stmt = this.db.prepare(query);
    const rows = clientId ? stmt.all(clientId) : stmt.all();

    return rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      processedAt: row.processed_at,
      totalFiles: row.total_files,
      successCount: row.success_count,
      failureCount: row.failure_count,
      files: JSON.parse(row.details)
    }));
  }

  // 設定関連のメソッド
  async getSetting(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key);

    return row ? row.value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(key, value, new Date().toISOString());
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.logger.info('Database connection closed');
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// エクスポート用のエイリアス
export { DatabaseService as Database };