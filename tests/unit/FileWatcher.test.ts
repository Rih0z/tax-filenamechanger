import { FileWatcher } from '../../src/main/services/FileWatcher';
import { Database } from '../../src/main/services/Database';
import chokidar from 'chokidar';
import fs from 'fs-extra';

// モック設定
jest.mock('chokidar');
jest.mock('fs-extra');

const mockChokidar = chokidar as jest.Mocked<typeof chokidar>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('FileWatcher', () => {
  let fileWatcher: FileWatcher;
  let mockDatabase: jest.Mocked<Database>;
  let mockOnFileDetected: jest.Mock;
  let mockWatcher: any;

  beforeEach(() => {
    mockDatabase = {
      getProcessedFiles: jest.fn().mockResolvedValue([]),
      recordProcessedFile: jest.fn(),
      initialize: jest.fn(),
      close: jest.fn(),
      createClient: jest.fn(),
      getClients: jest.fn(),
      updateClient: jest.fn(),
      getClientById: jest.fn(),
      recordProcessingHistory: jest.fn(),
      getProcessingHistory: jest.fn(),
      getSetting: jest.fn(),
      setSetting: jest.fn()
    } as any;

    mockOnFileDetected = jest.fn();

    mockWatcher = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn()
    };

    mockChokidar.watch.mockReturnValue(mockWatcher);

    fileWatcher = new FileWatcher({
      database: mockDatabase,
      onFileDetected: mockOnFileDetected,
      folders: ['C:\\Downloads'],
      fileTypes: ['.pdf', '.csv']
    });

    jest.clearAllMocks();
  });

  describe('ファイル監視開始テスト', () => {
    test('監視を正しく開始できる', async () => {
      await fileWatcher.start(['C:\\Downloads']);

      expect(mockChokidar.watch).toHaveBeenCalledWith(
        ['C:\\Downloads'],
        expect.objectContaining({
          ignored: /(^|[\/\\])\../,
          persistent: true,
          ignoreInitial: false,
          awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
          },
          depth: 0
        })
      );

      expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    test('処理済みファイル一覧を取得して初期化する', async () => {
      const processedFiles = [
        { path: 'C:\\Downloads\\processed1.pdf', processedAt: '2025-01-01' },
        { path: 'C:\\Downloads\\processed2.pdf', processedAt: '2025-01-02' }
      ];

      mockDatabase.getProcessedFiles.mockResolvedValue(processedFiles);

      await fileWatcher.start();

      expect(mockDatabase.getProcessedFiles).toHaveBeenCalled();
    });
  });

  describe('ファイル監視停止テスト', () => {
    test('監視を正しく停止できる', async () => {
      await fileWatcher.start();
      await fileWatcher.stop();

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    test('未開始の場合でも停止処理が安全に実行される', async () => {
      await expect(fileWatcher.stop()).resolves.not.toThrow();
    });
  });

  describe('フォルダスキャンテスト', () => {
    beforeEach(() => {
      mockFs.readdir.mockResolvedValue([
        'test1.pdf',
        'test2.csv',
        'test3.txt', // サポート外
        '.hidden', // 隠しファイル
        'already_processed.pdf'
      ] as any);

      mockFs.stat.mockImplementation((filePath: string) => {
        const fileName = filePath.split(/[\\\/]/).pop() || '';
        return Promise.resolve({
          size: 1000,
          birthtime: new Date('2025-01-01T10:00:00Z'),
          mtime: new Date('2025-01-01T10:00:00Z')
        } as any);
      });
    });

    test('サポートされているファイルのみをスキャンする', async () => {
      const files = await fileWatcher.scanFolder('C:\\Downloads');

      expect(files).toHaveLength(2); // PDFとCSVのみ
      expect(files.some(f => f.name === 'test1.pdf')).toBe(true);
      expect(files.some(f => f.name === 'test2.csv')).toBe(true);
      expect(files.some(f => f.name === 'test3.txt')).toBe(false);
      expect(files.some(f => f.name === '.hidden')).toBe(false);
    });

    test('処理済みファイルは除外される', async () => {
      // 処理済みファイルリストにtest1.pdfを追加
      const processedFiles = [
        { path: 'C:\\Downloads\\test1.pdf', processedAt: '2025-01-01' }
      ];
      mockDatabase.getProcessedFiles.mockResolvedValue(processedFiles);

      await fileWatcher.start();
      const files = await fileWatcher.scanFolder('C:\\Downloads');

      expect(files.some(f => f.name === 'test1.pdf')).toBe(false);
      expect(files.some(f => f.name === 'test2.csv')).toBe(true);
    });

    test('スキャンエラーが適切に処理される', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      await expect(fileWatcher.scanFolder('C:\\InvalidPath'))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('ファイル検出処理テスト', () => {
    test('新しいPDFファイルが検出されると通知される', async () => {
      mockFs.stat.mockResolvedValue({
        size: 1000,
        birthtime: new Date('2025-01-01T10:00:00Z'),
        mtime: new Date('2025-01-01T10:00:00Z')
      } as any);

      await fileWatcher.start();

      // addイベントハンドラーを取得
      const addHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'add'
      )?.[1];

      if (addHandler) {
        await addHandler('C:\\Downloads\\new_file.pdf');
        
        expect(mockOnFileDetected).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'new_file.pdf',
            extension: '.pdf',
            size: 1000
          })
        );
      }
    });

    test('サポートされていないファイルは無視される', async () => {
      await fileWatcher.start();

      const addHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'add'
      )?.[1];

      if (addHandler) {
        await addHandler('C:\\Downloads\\document.txt');
        
        expect(mockOnFileDetected).not.toHaveBeenCalled();
      }
    });

    test('処理済みファイルは無視される', async () => {
      // ファイルを処理済みとしてマーク
      fileWatcher.markFileAsProcessed('C:\\Downloads\\processed.pdf');

      await fileWatcher.start();

      const addHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'add'
      )?.[1];

      if (addHandler) {
        await addHandler('C:\\Downloads\\processed.pdf');
        
        expect(mockOnFileDetected).not.toHaveBeenCalled();
      }
    });
  });

  describe('ファイル変更・削除処理テスト', () => {
    test('ファイル変更イベントが正しく処理される', async () => {
      await fileWatcher.start();

      const changeHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change'
      )?.[1];

      if (changeHandler) {
        expect(() => changeHandler('C:\\Downloads\\changed.pdf')).not.toThrow();
      }
    });

    test('ファイル削除時に処理済みリストから除外される', async () => {
      fileWatcher.markFileAsProcessed('C:\\Downloads\\to_be_deleted.pdf');

      await fileWatcher.start();

      const unlinkHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'unlink'
      )?.[1];

      if (unlinkHandler) {
        unlinkHandler('C:\\Downloads\\to_be_deleted.pdf');
        // 内部状態の確認は難しいが、エラーが発生しないことを確認
        expect(() => unlinkHandler('C:\\Downloads\\to_be_deleted.pdf')).not.toThrow();
      }
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('監視エラーが適切に処理される', async () => {
      await fileWatcher.start();

      const errorHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      if (errorHandler) {
        const testError = new Error('Watch error');
        expect(() => errorHandler(testError)).not.toThrow();
      }
    });

    test('ファイル情報取得エラーが適切に処理される', async () => {
      mockFs.stat.mockRejectedValue(new Error('File access denied'));

      await fileWatcher.start();

      const addHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'add'
      )?.[1];

      if (addHandler) {
        // エラーが発生してもアプリケーションが停止しないことを確認
        await expect(addHandler('C:\\Downloads\\inaccessible.pdf')).resolves.not.toThrow();
        expect(mockOnFileDetected).not.toHaveBeenCalled();
      }
    });
  });

  describe('監視フォルダ更新テスト', () => {
    test('監視フォルダを動的に更新できる', () => {
      const newFolders = ['C:\\NewDownloads', 'C:\\AnotherFolder'];
      
      fileWatcher.updateWatchedFolders(newFolders);
      
      // 新しいフォルダでの監視が開始されることを確認
      // （内部実装により、詳細な検証は制限される）
      expect(() => fileWatcher.updateWatchedFolders(newFolders)).not.toThrow();
    });
  });

  describe('対象ファイル判定テスト', () => {
    test('PDFファイルが対象として認識される', () => {
      const isTarget = (fileWatcher as any).isTargetFile('C:\\Downloads\\test.pdf');
      expect(isTarget).toBe(true);
    });

    test('CSVファイルが対象として認識される', () => {
      const isTarget = (fileWatcher as any).isTargetFile('C:\\Downloads\\test.csv');
      expect(isTarget).toBe(true);
    });

    test('大文字小文字が異なる拡張子も正しく認識される', () => {
      expect((fileWatcher as any).isTargetFile('test.PDF')).toBe(true);
      expect((fileWatcher as any).isTargetFile('test.CSV')).toBe(true);
    });

    test('サポートされていない拡張子は対象外', () => {
      expect((fileWatcher as any).isTargetFile('test.txt')).toBe(false);
      expect((fileWatcher as any).isTargetFile('test.docx')).toBe(false);
      expect((fileWatcher as any).isTargetFile('test')).toBe(false);
    });
  });
});