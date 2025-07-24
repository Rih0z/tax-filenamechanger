import { Database } from '../../src/main/services/Database';
import { Client } from '../../src/shared/types';
import BetterSqlite3 from 'better-sqlite3';
import fs from 'fs-extra';

// モック設定
jest.mock('better-sqlite3');
jest.mock('fs-extra');

const mockDatabase = BetterSqlite3 as jest.MockedClass<typeof BetterSqlite3>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Database', () => {
  let database: Database;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      exec: jest.fn(),
      prepare: jest.fn(() => ({
        run: jest.fn(),
        get: jest.fn(),
        all: jest.fn()
      })),
      close: jest.fn()
    };

    mockDatabase.mockReturnValue(mockDb);
    mockFs.ensureDir.mockResolvedValue(undefined);

    database = new Database();
    jest.clearAllMocks();
  });

  describe('データベース初期化テスト', () => {
    test('データベースが正常に初期化される', async () => {
      await database.initialize();

      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockDatabase).toHaveBeenCalledWith(expect.any(String));
      expect(mockDb.exec).toHaveBeenCalledTimes(4); // 4つのテーブル作成
    });

    test('初期化時にテーブルが作成される', async () => {
      await database.initialize();

      const execCalls = mockDb.exec.mock.calls;
      expect(execCalls.some(call => call[0].includes('CREATE TABLE IF NOT EXISTS clients'))).toBe(true);
      expect(execCalls.some(call => call[0].includes('CREATE TABLE IF NOT EXISTS processed_files'))).toBe(true);
      expect(execCalls.some(call => call[0].includes('CREATE TABLE IF NOT EXISTS processing_history'))).toBe(true);
      expect(execCalls.some(call => call[0].includes('CREATE TABLE IF NOT EXISTS settings'))).toBe(true);
    });

    test('初期化エラーが適切に処理される', async () => {
      mockFs.ensureDir.mockRejectedValue(new Error('Directory creation failed'));

      await expect(database.initialize()).rejects.toThrow('Directory creation failed');
    });
  });

  describe('クライアント管理テスト', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    test('新しいクライアントを作成できる', async () => {
      const mockStatement = {
        run: jest.fn()
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const clientData = {
        name: 'テスト株式会社',
        corporateNumber: '1234567890123',
        fiscalYearEnd: '2503',
        outputFolder: 'C:\\TaxDocs\\Test\\2503期'
      };

      const result = await database.createClient(clientData);

      expect(result).toMatchObject(clientData);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(mockStatement.run).toHaveBeenCalled();
    });

    test('クライアント一覧を取得できる', async () => {
      const mockClients = [
        {
          id: 'client1',
          name: 'メトロノーム株式会社',
          corporate_number: '1234567890123',
          fiscal_year_end: '2407',
          output_folder: 'C:\\TaxDocs\\Metro\\2407期',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'client2',
          name: 'エバーリッジ株式会社',
          corporate_number: null,
          fiscal_year_end: '2503',
          output_folder: 'C:\\TaxDocs\\Ever\\2503期',
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z'
        }
      ];

      const mockStatement = {
        all: jest.fn().mockReturnValue(mockClients)
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const clients = await database.getClients();

      expect(clients).toHaveLength(2);
      expect(clients[0]).toEqual({
        id: 'client1',
        name: 'メトロノーム株式会社',
        corporateNumber: '1234567890123',
        fiscalYearEnd: '2407',
        outputFolder: 'C:\\TaxDocs\\Metro\\2407期',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      });
    });

    test('IDでクライアントを取得できる', async () => {
      const mockClient = {
        id: 'client1',
        name: 'テスト株式会社',
        corporate_number: null,
        fiscal_year_end: '2503',
        output_folder: 'C:\\TaxDocs\\Test\\2503期',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const mockStatement = {
        get: jest.fn().mockReturnValue(mockClient)
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const client = await database.getClientById('client1');

      expect(client).toEqual({
        id: 'client1',
        name: 'テスト株式会社',
        corporateNumber: null,
        fiscalYearEnd: '2503',
        outputFolder: 'C:\\TaxDocs\\Test\\2503期',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      });
    });

    test('存在しないクライアントの場合nullを返す', async () => {
      const mockStatement = {
        get: jest.fn().mockReturnValue(undefined)
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const client = await database.getClientById('nonexistent');

      expect(client).toBeNull();
    });

    test('クライアント情報を更新できる', async () => {
      // 既存クライアントの取得をモック
      const existingClient = {
        id: 'client1',
        name: '旧社名株式会社',
        corporate_number: null,
        fiscal_year_end: '2503',
        output_folder: 'C:\\TaxDocs\\Old\\2503期',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const mockGetStatement = {
        get: jest.fn().mockReturnValue(existingClient)
      };

      const mockUpdateStatement = {
        run: jest.fn()
      };

      mockDb.prepare
        .mockReturnValueOnce(mockUpdateStatement) // update用
        .mockReturnValueOnce(mockGetStatement);   // getClientById用

      const updates = {
        name: '新社名株式会社',
        outputFolder: 'C:\\TaxDocs\\New\\2503期'
      };

      const result = await database.updateClient('client1', updates);

      expect(result.name).toBe('新社名株式会社');
      expect(result.outputFolder).toBe('C:\\TaxDocs\\New\\2503期');
      expect(mockUpdateStatement.run).toHaveBeenCalled();
    });
  });

  describe('処理済みファイル管理テスト', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    test('処理済みファイルを記録できる', async () => {
      const mockStatement = {
        run: jest.fn()
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const fileInfo = {
        path: 'C:\\TaxDocs\\Client1\\0001_法人税申告書_2407.pdf',
        originalName: '法人税及び地方法人税申告書_20240731メトロノーム株式会社.pdf',
        newName: '0001_法人税申告書_2407.pdf',
        documentType: '法人税申告書',
        clientId: 'client1'
      };

      await database.recordProcessedFile(fileInfo);

      expect(mockStatement.run).toHaveBeenCalledWith(
        expect.any(String), // id
        fileInfo.path,
        fileInfo.originalName,
        fileInfo.newName,
        fileInfo.documentType,
        fileInfo.clientId,
        expect.any(String)  // processed_at
      );
    });

    test('処理済みファイル一覧を取得できる', async () => {
      const mockFiles = [
        { path: 'C:\\TaxDocs\\file1.pdf', processed_at: '2025-01-01T10:00:00Z' },
        { path: 'C:\\TaxDocs\\file2.pdf', processed_at: '2025-01-01T11:00:00Z' }
      ];

      const mockStatement = {
        all: jest.fn().mockReturnValue(mockFiles)
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const files = await database.getProcessedFiles();

      expect(files).toEqual([
        { path: 'C:\\TaxDocs\\file1.pdf', processedAt: '2025-01-01T10:00:00Z' },
        { path: 'C:\\TaxDocs\\file2.pdf', processedAt: '2025-01-01T11:00:00Z' }
      ]);
    });
  });

  describe('処理履歴管理テスト', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    test('処理履歴を記録できる', async () => {
      const mockStatement = {
        run: jest.fn()
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const history = {
        clientId: 'client1',
        totalFiles: 3,
        successCount: 2,
        failureCount: 1,
        files: [
          { originalName: 'file1.pdf', newName: '0001_file1.pdf', documentType: '法人税申告書', status: 'success' as const },
          { originalName: 'file2.pdf', newName: '0002_file2.pdf', documentType: '消費税申告書', status: 'success' as const },
          { originalName: 'file3.pdf', newName: '', documentType: '不明', status: 'failed' as const, error: 'Parse error' }
        ]
      };

      await database.recordProcessingHistory(history);

      expect(mockStatement.run).toHaveBeenCalledWith(
        expect.any(String), // id
        history.clientId,
        expect.any(String), // processed_at
        history.totalFiles,
        history.successCount,
        history.failureCount,
        JSON.stringify(history.files)
      );
    });

    test('処理履歴一覧を取得できる', async () => {
      const mockHistory = [
        {
          id: 'history1',
          client_id: 'client1',
          client_name: 'メトロノーム株式会社',
          processed_at: '2025-01-01T10:00:00Z',
          total_files: 2,
          success_count: 2,
          failure_count: 0,
          details: JSON.stringify([
            { originalName: 'file1.pdf', newName: '0001_file1.pdf', status: 'success' }
          ])
        }
      ];

      const mockStatement = {
        all: jest.fn().mockReturnValue(mockHistory)
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const history = await database.getProcessingHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({
        id: 'history1',
        clientId: 'client1',
        clientName: 'メトロノーム株式会社',
        processedAt: '2025-01-01T10:00:00Z',
        totalFiles: 2,
        successCount: 2,
        failureCount: 0,
        files: [{ originalName: 'file1.pdf', newName: '0001_file1.pdf', status: 'success' }]
      });
    });

    test('特定クライアントの処理履歴を取得できる', async () => {
      const mockStatement = {
        all: jest.fn().mockReturnValue([])
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      await database.getProcessingHistory('client1');

      expect(mockStatement.all).toHaveBeenCalledWith('client1');
    });
  });

  describe('設定管理テスト', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    test('設定値を取得できる', async () => {
      const mockStatement = {
        get: jest.fn().mockReturnValue({ value: 'test-value' })
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const value = await database.getSetting('test-key');

      expect(value).toBe('test-value');
      expect(mockStatement.get).toHaveBeenCalledWith('test-key');
    });

    test('存在しない設定キーの場合nullを返す', async () => {
      const mockStatement = {
        get: jest.fn().mockReturnValue(undefined)
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const value = await database.getSetting('nonexistent-key');

      expect(value).toBeNull();
    });

    test('設定値を保存できる', async () => {
      const mockStatement = {
        run: jest.fn()
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      await database.setSetting('test-key', 'test-value');

      expect(mockStatement.run).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        expect.any(String) // updated_at
      );
    });
  });

  describe('データベース終了テスト', () => {
    test('データベース接続を正常に終了できる', async () => {
      await database.initialize();
      await database.close();

      expect(mockDb.close).toHaveBeenCalled();
    });

    test('未初期化状態での終了処理が安全に実行される', async () => {
      await expect(database.close()).resolves.not.toThrow();
    });
  });

  describe('ID生成テスト', () => {
    test('ユニークなIDが生成される', () => {
      const id1 = (database as any).generateId();
      const id2 = (database as any).generateId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });
});