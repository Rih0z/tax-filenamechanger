import { FileRenamer } from '../../src/main/services/FileRenamer';
import { DocumentType } from '../../src/shared/types';
import fs from 'fs-extra';
import path from 'path';

// fs-extraのモック
jest.mock('fs-extra');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('FileRenamer', () => {
  let fileRenamer: FileRenamer;

  beforeEach(() => {
    fileRenamer = new FileRenamer();
    jest.clearAllMocks();
  });

  describe('ファイル名生成テスト', () => {
    test('法人税申告書の推奨名を正しく生成する', () => {
      const result = fileRenamer.generateSuggestedName(
        DocumentType.CORPORATE_TAX,
        'メトロノーム株式会社',
        '2407'
      );
      
      expect(result).toBe('0001_法人税及び地方法人税申告書_2407.pdf');
    });

    test('消費税申告書の推奨名を正しく生成する', () => {
      const result = fileRenamer.generateSuggestedName(
        DocumentType.CONSUMPTION_TAX,
        'エバーリッジ株式会社',
        '2503'
      );
      
      expect(result).toBe('3001_消費税及び地方消費税申告書_2503.pdf');
    });

    test('東京都の都道府県税申告書の推奨名を生成する', () => {
      const result = fileRenamer.generateSuggestedName(
        DocumentType.PREFECTURAL_TAX,
        'メトロノーム株式会社',
        '2407',
        '東京都'
      );
      
      expect(result).toBe('1000_都道府県税申告書_2407.pdf');
    });

    test('受信通知の推奨名を生成する', () => {
      const result = fileRenamer.generateSuggestedName(
        DocumentType.RECEIPT_NOTICE,
        'メトロノーム株式会社',
        '2407'
      );
      
      expect(result).toBe('0003_受信通知_2407.pdf');
    });

    test('納付情報の推奨名を生成する', () => {
      const result = fileRenamer.generateSuggestedName(
        DocumentType.PAYMENT_INFO,
        'メトロノーム株式会社',
        '2407'
      );
      
      expect(result).toBe('0004_納付情報_2407.pdf');
    });

    test('決算書の推奨名を生成する', () => {
      const result = fileRenamer.generateSuggestedName(
        DocumentType.FINANCIAL_STATEMENT,
        'メトロノーム株式会社',
        '2407'
      );
      
      expect(result).toBe('5001_決算書_2407.pdf');
    });

    test('固定資産台帳の推奨名を生成する', () => {
      const result = fileRenamer.generateSuggestedName(
        DocumentType.FIXED_ASSET,
        'メトロノーム株式会社',
        '2407'
      );
      
      expect(result).toBe('6001_固定資産台帳_2407.pdf');
    });

    test('税区分集計表の推奨名を生成する', () => {
      const result = fileRenamer.generateSuggestedName(
        DocumentType.TAX_CLASSIFICATION,
        'メトロノーム株式会社',
        '2407'
      );
      
      expect(result).toBe('7001_税区分集計表_2407.pdf');
    });
  });

  describe('カテゴリフォルダ分類テスト', () => {
    test('法人税（0000番台）のフォルダ分類が正しい', () => {
      const result = (fileRenamer as any).getCategoryFolder('0001_法人税申告書_2407.pdf');
      expect(result).toBe('0000番台_法人税');
    });

    test('都道府県税（1000番台）のフォルダ分類が正しい', () => {
      const result = (fileRenamer as any).getCategoryFolder('1011_東京都_申告書_2407.pdf');
      expect(result).toBe('1000番台_都道府県税');
    });

    test('市民税（2000番台）のフォルダ分類が正しい', () => {
      const result = (fileRenamer as any).getCategoryFolder('2001_蒲郡市_申告書_2407.pdf');
      expect(result).toBe('2000番台_市民税');
    });

    test('消費税（3000番台）のフォルダ分類が正しい', () => {
      const result = (fileRenamer as any).getCategoryFolder('3001_消費税申告書_2407.pdf');
      expect(result).toBe('3000番台_消費税');
    });

    test('決算書類（5000番台）のフォルダ分類が正しい', () => {
      const result = (fileRenamer as any).getCategoryFolder('5001_決算書_2407.pdf');
      expect(result).toBe('5000番台_決算書類');
    });

    test('固定資産（6000番台）のフォルダ分類が正しい', () => {
      const result = (fileRenamer as any).getCategoryFolder('6001_固定資産台帳_2407.pdf');
      expect(result).toBe('6000番台_固定資産');
    });

    test('税区分集計表（7000番台）のフォルダ分類が正しい', () => {
      const result = (fileRenamer as any).getCategoryFolder('7001_税区分集計表_2407.pdf');
      expect(result).toBe('7000番台_税区分集計表');
    });

    test('不正な番台の場合はその他フォルダに分類', () => {
      const result = (fileRenamer as any).getCategoryFolder('invalid_filename.pdf');
      expect(result).toBe('その他');
    });
  });

  describe('ファイル名バリデーションテスト', () => {
    test('有効なPDFファイル名を受け入れる', () => {
      const result = (fileRenamer as any).isValidFileName('0001_法人税申告書_2407.pdf');
      expect(result).toBe(true);
    });

    test('有効なCSVファイル名を受け入れる', () => {
      const result = (fileRenamer as any).isValidFileName('5006_仕訳データ_2407.csv');
      expect(result).toBe(true);
    });

    test('不正な文字を含むファイル名を拒否する', () => {
      const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];
      
      for (const char of invalidChars) {
        const fileName = `test${char}file.pdf`;
        const result = (fileRenamer as any).isValidFileName(fileName);
        expect(result).toBe(false);
      }
    });

    test('長すぎるファイル名を拒否する', () => {
      const longName = 'a'.repeat(256) + '.pdf';
      const result = (fileRenamer as any).isValidFileName(longName);
      expect(result).toBe(false);
    });

    test('サポートされていない拡張子を拒否する', () => {
      const result = (fileRenamer as any).isValidFileName('test.txt');
      expect(result).toBe(false);
    });
  });

  describe('ファイルリネーム処理テスト', () => {
    beforeEach(() => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockResolvedValue({
        isFile: () => true
      } as any);
      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.copy.mockResolvedValue(undefined);
      mockFs.move.mockResolvedValue(undefined);
    });

    test('正常なファイルリネームが成功する', async () => {
      const options = {
        fileId: 'test-id',
        oldPath: 'C:\\Downloads\\old-file.pdf',
        newName: '0001_法人税申告書_2407.pdf',
        targetFolder: 'C:\\TaxDocs\\Client1\\2407期',
        backup: true
      };

      const result = await fileRenamer.renameFile(options);

      expect(result.success).toBe(true);
      expect(result.oldPath).toBe(options.oldPath);
      expect(result.newPath).toContain('0001_法人税申告書_2407.pdf');
      expect(mockFs.move).toHaveBeenCalled();
    });

    test('存在しないファイルの場合はエラーを返す', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const options = {
        fileId: 'test-id',
        oldPath: 'C:\\Downloads\\nonexistent.pdf',
        newName: '0001_法人税申告書_2407.pdf',
        targetFolder: 'C:\\TaxDocs\\Client1\\2407期',
        backup: true
      };

      const result = await fileRenamer.renameFile(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source file not found');
    });

    test('不正なファイル名の場合はエラーを返す', async () => {
      const options = {
        fileId: 'test-id',
        oldPath: 'C:\\Downloads\\valid-file.pdf',
        newName: 'invalid<file>name.pdf',
        targetFolder: 'C:\\TaxDocs\\Client1\\2407期',
        backup: true
      };

      const result = await fileRenamer.renameFile(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid file name');
    });

    test('バックアップが正しく作成される', async () => {
      const options = {
        fileId: 'test-id',
        oldPath: 'C:\\Downloads\\test-file.pdf',
        newName: '0001_法人税申告書_2407.pdf',
        targetFolder: 'C:\\TaxDocs\\Client1\\2407期',
        backup: true
      };

      await fileRenamer.renameFile(options);

      expect(mockFs.copy).toHaveBeenCalled();
      expect(mockFs.ensureDir).toHaveBeenCalled();
    });
  });

  describe('バッチ処理テスト', () => {
    beforeEach(() => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockResolvedValue({
        isFile: () => true
      } as any);
      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.copy.mockResolvedValue(undefined);
      mockFs.move.mockResolvedValue(undefined);
    });

    test('複数ファイルの一括リネームが成功する', async () => {
      const operations = [
        {
          fileId: 'file1',
          oldPath: 'C:\\Downloads\\file1.pdf',
          newName: '0001_法人税申告書_2407.pdf',
          targetFolder: 'C:\\TaxDocs\\Client1\\2407期'
        },
        {
          fileId: 'file2',
          oldPath: 'C:\\Downloads\\file2.pdf',
          newName: '3001_消費税申告書_2407.pdf',
          targetFolder: 'C:\\TaxDocs\\Client1\\2407期'
        }
      ];

      const results = await fileRenamer.batchRename(operations);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockFs.move).toHaveBeenCalledTimes(2);
    });

    test('一部失敗しても他のファイル処理を継続する', async () => {
      // 最初のファイルを存在しないように設定
      mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(!path.includes('file1'));
      });

      const operations = [
        {
          fileId: 'file1',
          oldPath: 'C:\\Downloads\\nonexistent.pdf',
          newName: '0001_法人税申告書_2407.pdf',
          targetFolder: 'C:\\TaxDocs\\Client1\\2407期'
        },
        {
          fileId: 'file2',
          oldPath: 'C:\\Downloads\\file2.pdf',
          newName: '3001_消費税申告書_2407.pdf',
          targetFolder: 'C:\\TaxDocs\\Client1\\2407期'
        }
      ];

      const results = await fileRenamer.batchRename(operations);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });
  });

  describe('重複ファイル処理テスト', () => {
    test('重複ファイルが存在する場合、連番を付与する', async () => {
      // 最初のチェックで重複あり、2回目のチェックで重複なし
      mockFs.pathExists
        .mockResolvedValueOnce(true) // 元ファイル存在
        .mockResolvedValueOnce(true) // 重複あり
        .mockResolvedValueOnce(false); // 連番付きは重複なし

      const duplicatePath = 'C:\\TaxDocs\\Client1\\2407期\\0000番台_法人税\\0001_法人税申告書_2407.pdf';
      const result = await (fileRenamer as any).checkDuplicates(duplicatePath);

      expect(result).toContain('0001_法人税申告書_2407_(1).pdf');
    });
  });

  describe('バックアップ復元テスト', () => {
    test('バックアップからファイルを復元できる', async () => {
      const backupPath = 'C:\\TaxDocs\\.backup\\2025-07-22T10-00-00-000Z_original.pdf';
      const originalPath = 'C:\\TaxDocs\\original.pdf';

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.copy.mockResolvedValue(undefined);

      await fileRenamer.restoreFromBackup(backupPath, originalPath);

      expect(mockFs.copy).toHaveBeenCalledWith(backupPath, originalPath, { overwrite: true });
    });

    test('存在しないバックアップからの復元は失敗する', async () => {
      const backupPath = 'C:\\TaxDocs\\.backup\\nonexistent.pdf';
      const originalPath = 'C:\\TaxDocs\\original.pdf';

      mockFs.pathExists.mockResolvedValue(false);

      await expect(fileRenamer.restoreFromBackup(backupPath, originalPath))
        .rejects.toThrow('Backup file not found');
    });
  });
});