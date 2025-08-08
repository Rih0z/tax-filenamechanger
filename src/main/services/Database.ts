import path from 'path';
import fs from 'fs-extra';
import { Client, ProcessingHistory, ProcessedFileInfo } from '../../shared/types';
import { APP_CONFIG } from '../../shared/constants/config';
import { Logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface DatabaseData {
  clients: Client[];
  history: ProcessingHistory[];
  processedFiles: string[];
}

export class DatabaseService {
  private dataPath: string;
  private data: DatabaseData;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('Database');
    this.dataPath = path.join(path.dirname(APP_CONFIG.DATABASE.PATH), 'data.json');
    this.data = {
      clients: [],
      history: [],
      processedFiles: []
    };
  }

  async initialize() {
    try {
      const dataDir = path.dirname(this.dataPath);
      
      // データディレクトリの作成
      await fs.ensureDir(dataDir);
      
      // 既存データの読み込み
      if (await fs.pathExists(this.dataPath)) {
        const jsonData = await fs.readJson(this.dataPath);
        this.data = {
          clients: jsonData.clients || [],
          history: jsonData.history || [],
          processedFiles: jsonData.processedFiles || []
        };
        this.logger.info(`Data loaded from: ${this.dataPath}`);
      } else {
        // 初期データの作成
        await this.saveData();
        this.logger.info(`New data file created: ${this.dataPath}`);
      }
      
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async saveData() {
    try {
      await fs.writeJson(this.dataPath, this.data, { spaces: 2 });
    } catch (error) {
      this.logger.error('Failed to save data:', error);
      throw error;
    }
  }

  async close() {
    await this.saveData();
    this.logger.info('Database closed');
  }

  // クライアント管理
  async getAllClients(): Promise<Client[]> {
    return this.data.clients;
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.data.clients.find(c => c.id === id);
  }

  async createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const newClient: Client = {
      ...client,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.data.clients.push(newClient);
    await this.saveData();
    
    this.logger.info(`Client created: ${newClient.name}`);
    return newClient;
  }

  async updateClient(id: string, updates: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client> {
    const index = this.data.clients.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Client not found: ${id}`);
    }
    
    const updatedClient = {
      ...this.data.clients[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.data.clients[index] = updatedClient;
    await this.saveData();
    
    this.logger.info(`Client updated: ${updatedClient.name}`);
    return updatedClient;
  }

  async deleteClient(id: string): Promise<void> {
    const index = this.data.clients.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Client not found: ${id}`);
    }
    
    const clientName = this.data.clients[index].name;
    this.data.clients.splice(index, 1);
    await this.saveData();
    
    this.logger.info(`Client deleted: ${clientName}`);
  }

  // ファイル処理済み管理
  async isFileProcessed(filePath: string): Promise<boolean> {
    return this.data.processedFiles.includes(filePath);
  }

  async markFileAsProcessed(filePath: string): Promise<void> {
    if (!this.data.processedFiles.includes(filePath)) {
      this.data.processedFiles.push(filePath);
      await this.saveData();
      this.logger.info(`File marked as processed: ${filePath}`);
    }
  }

  async getProcessedFiles(): Promise<string[]> {
    return this.data.processedFiles;
  }

  async clearProcessedFiles(): Promise<void> {
    this.data.processedFiles = [];
    await this.saveData();
    this.logger.info('Processed files cleared');
  }

  // 処理履歴管理
  async addProcessingHistory(history: Omit<ProcessingHistory, 'id'>): Promise<ProcessingHistory> {
    const newHistory: ProcessingHistory = {
      ...history,
      id: uuidv4()
    };
    
    this.data.history.push(newHistory);
    
    // 最新100件のみ保持
    if (this.data.history.length > 100) {
      this.data.history = this.data.history.slice(-100);
    }
    
    await this.saveData();
    this.logger.info(`Processing history added: ${newHistory.id}`);
    return newHistory;
  }

  async getProcessingHistory(limit: number = 50): Promise<ProcessingHistory[]> {
    return this.data.history.slice(-limit).reverse();
  }

  async clearHistory(): Promise<void> {
    this.data.history = [];
    await this.saveData();
    this.logger.info('Processing history cleared');
  }
}