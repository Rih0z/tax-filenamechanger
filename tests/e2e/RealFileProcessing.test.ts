/**
 * 実際のファイル処理E2Eテスト
 * モックを使わず、実際のファイルシステムを使用して動作確認
 */

import { PDFParser } from '../../src/main/services/PDFParser';
import { FileRenamer } from '../../src/main/services/FileRenamer';
import { FileWatcher } from '../../src/main/services/FileWatcher';
import { Database } from '../../src/main/services/Database';
import { DocumentType } from '../../src/shared/types';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// 実際のファイルシステムを使用するため、モックを無効化
jest.unmock('fs-extra');
jest.unmock('better-sqlite3');
jest.unmock('pdf-parse');

describe('実ファイル処理E2Eテスト', () => {
  const testDir = path.join(os.tmpdir(), 'tax-renamer-test');
  const sourceDir = path.join(testDir, 'source');
  const targetDir = path.join(testDir, 'target');
  const dbPath = path.join(testDir, 'test.db');
  
  let pdfParser: PDFParser;
  let fileRenamer: FileRenamer;
  let database: Database;

  beforeAll(async () => {
    // テスト環境のセットアップ
    await fs.ensureDir(sourceDir);
    await fs.ensureDir(targetDir);
    
    // 実際のサービスインスタンスを作成（モックなし）
    pdfParser = new PDFParser();
    fileRenamer = new FileRenamer();
    
    // テスト用データベース
    process.env.DB_PATH = dbPath;
    database = new Database();
    await database.initialize();
  });

  afterAll(async () => {
    // テスト環境のクリーンアップ
    await database.close();
    await fs.remove(testDir);
  });

  beforeEach(async () => {
    // 各テスト前にディレクトリをクリア
    await fs.emptyDir(sourceDir);
    await fs.emptyDir(targetDir);
  });

  describe('PDFファイル名解析（実装確認）', () => {
    test('e-Tax形式ファイル名の解析精度', () => {
      // 実際のREADMEサンプルファイル名での検証
      const testCases = [
        {
          fileName: '法人税及び地方法人税申告書_20240731テスト会社株式会社_20250720130102.pdf',
          expectedType: DocumentType.CORPORATE_TAX,
          expectedCompany: 'テスト会社株式会社',
          expectedFiscalYear: '2407'
        },
        {
          fileName: '消費税申告書_20240731テスト会社株式会社_20250720130433.pdf',
          expectedType: DocumentType.CONSUMPTION_TAX,
          expectedCompany: 'テスト会社株式会社',
          expectedFiscalYear: '2407'
        },
        {
          fileName: '東京都　法人都道府県民税・事業税・特別法人事業税又は地方法人特別税　確定申告_20240731テスト会社　株式会社_20250720133418.pdf',
          expectedType: DocumentType.PREFECTURAL_TAX,
          expectedCompany: 'テスト会社株式会社',
          expectedFiscalYear: '2407'
        }
      ];

      for (const testCase of testCases) {
        const analysis = (pdfParser as any).analyzeFileName(testCase.fileName);
        
        expect(analysis.documentType).toBe(testCase.expectedType);
        expect(analysis.companyName).toBe(testCase.expectedCompany);
        expect(analysis.fiscalYear).toBe(testCase.expectedFiscalYear);
        expect(analysis.confidence).toBeGreaterThan(0.8);
      }
    });

    test('手動命名パターンの解析', () => {
      const testCases = [
        { fileName: '法人税　受信通知.pdf', expectedType: DocumentType.RECEIPT_NOTICE },
        { fileName: '消費税　納付情報登録依頼.pdf', expectedType: DocumentType.PAYMENT_INFO },
        { fileName: '決算書_20250720_1535.pdf', expectedType: DocumentType.FINANCIAL_STATEMENT },
        { fileName: '固定資産台帳.pdf', expectedType: DocumentType.FIXED_ASSET }
      ];

      for (const testCase of testCases) {
        const analysis = (pdfParser as any).analyzeFileName(testCase.fileName);
        expect(analysis.documentType).toBe(testCase.expectedType);
      }
    });
  });

  describe('リネーム推奨名生成（実装確認）', () => {
    test('番号体系との完全一致', () => {
      const testCases = [
        {
          docType: DocumentType.CORPORATE_TAX,
          fiscalYear: '2407',
          expected: '0001_法人税及び地方法人税申告書_2407.pdf'
        },
        {
          docType: DocumentType.CONSUMPTION_TAX,
          fiscalYear: '2407',
          expected: '3001_消費税及び地方消費税申告書_2407.pdf'
        },
        {
          docType: DocumentType.RECEIPT_NOTICE,
          fiscalYear: '2407',
          expected: '0003_受信通知_2407.pdf'
        },
        {
          docType: DocumentType.PAYMENT_INFO,
          fiscalYear: '2407',
          expected: '0004_納付情報_2407.pdf'
        },
        {
          docType: DocumentType.FINANCIAL_STATEMENT,
          fiscalYear: '2407',
          expected: '5001_決算書_2407.pdf'
        },
        {
          docType: DocumentType.FIXED_ASSET,
          fiscalYear: '2407',
          expected: '6001_固定資産台帳_2407.pdf'
        },
        {
          docType: DocumentType.TAX_CLASSIFICATION,
          fiscalYear: '2407',
          expected: '7001_税区分集計表_2407.pdf'
        }
      ];

      for (const testCase of testCases) {
        const result = fileRenamer.generateSuggestedName(
          testCase.docType,
          'テスト会社株式会社',
          testCase.fiscalYear
        );
        
        expect(result).toBe(testCase.expected);
      }
    });
  });

  describe('実ファイル操作テスト', () => {
    test('実際のファイルリネーム・移動処理', async () => {
      // テスト用PDFファイルを作成（空ファイル）
      const sourceFile = path.join(sourceDir, 'test_file.pdf');
      await fs.writeFile(sourceFile, 'テスト用PDFファイル');

      // リネーム処理を実行
      const result = await fileRenamer.renameFile({
        fileId: 'test-id',
        oldPath: sourceFile,
        newName: '0001_法人税申告書_2407.pdf',
        targetFolder: targetDir,
        backup: true
      });

      // 結果確認
      expect(result.success).toBe(true);
      expect(result.newPath).toContain('0001_法人税申告書_2407.pdf');

      // ファイルが実際に移動されたか確認
      expect(await fs.pathExists(result.newPath)).toBe(true);
      expect(await fs.pathExists(sourceFile)).toBe(false);

      // バックアップが作成されたか確認
      if (result.backupPath) {
        expect(await fs.pathExists(result.backupPath)).toBe(true);
      }
    });

    test('フォルダ自動作成の確認', async () => {
      const sourceFile = path.join(sourceDir, 'corporate_tax.pdf');
      await fs.writeFile(sourceFile, 'テスト用ファイル');

      await fileRenamer.renameFile({
        fileId: 'test-id',
        oldPath: sourceFile,
        newName: '0001_法人税申告書_2407.pdf',
        targetFolder: targetDir,
        createSubfolders: true
      });

      // カテゴリフォルダが自動作成されたか確認
      const expectedFolder = path.join(targetDir, '0000番台_法人税');
      expect(await fs.pathExists(expectedFolder)).toBe(true);
    });

    test('重複ファイル名の自動解決', async () => {
      // 最初のファイルを作成
      const sourceFile1 = path.join(sourceDir, 'file1.pdf');
      const sourceFile2 = path.join(sourceDir, 'file2.pdf');
      await fs.writeFile(sourceFile1, 'ファイル1');
      await fs.writeFile(sourceFile2, 'ファイル2');

      const sameName = '0001_法人税申告書_2407.pdf';

      // 同じ名前で2つのファイルをリネーム
      const result1 = await fileRenamer.renameFile({
        fileId: 'test-id-1',
        oldPath: sourceFile1,
        newName: sameName,
        targetFolder: targetDir
      });

      const result2 = await fileRenamer.renameFile({
        fileId: 'test-id-2',
        oldPath: sourceFile2,
        newName: sameName,
        targetFolder: targetDir
      });

      // 両方とも成功することを確認
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // 2つ目のファイルは連番が付いていることを確認
      expect(result2.newPath).toContain('(1)');
      expect(await fs.pathExists(result1.newPath)).toBe(true);
      expect(await fs.pathExists(result2.newPath)).toBe(true);
    });
  });

  describe('データベース統合テスト', () => {
    test('クライアント管理の完全な流れ', async () => {
      // クライアント作成
      const clientData = {
        name: 'テスト統合株式会社',
        fiscalYearEnd: '2407',
        outputFolder: targetDir,
        corporateNumber: '1234567890123'
      };

      const createdClient = await database.createClient(clientData);
      expect(createdClient.id).toBeDefined();
      expect(createdClient.name).toBe(clientData.name);

      // クライアント取得
      const foundClient = await database.getClientById(createdClient.id);
      expect(foundClient).toEqual(createdClient);

      // クライアント一覧取得
      const allClients = await database.getClients();
      expect(allClients.some(c => c.id === createdClient.id)).toBe(true);

      // クライアント更新
      const updatedClient = await database.updateClient(createdClient.id, {
        name: '更新後株式会社'
      });
      expect(updatedClient.name).toBe('更新後株式会社');
    });

    test('処理履歴の記録と取得', async () => {
      // クライアント作成
      const client = await database.createClient({
        name: '履歴テスト株式会社',
        fiscalYearEnd: '2407',
        outputFolder: targetDir
      });

      // 処理履歴記録
      const historyData = {
        clientId: client.id,
        totalFiles: 2,
        successCount: 1,
        failureCount: 1,
        files: [
          {
            originalName: 'test1.pdf',
            newName: '0001_test1.pdf',
            documentType: DocumentType.CORPORATE_TAX,
            status: 'success' as const
          },
          {
            originalName: 'test2.pdf',
            newName: '',
            documentType: DocumentType.UNKNOWN,
            status: 'failed' as const,
            error: 'Parse error'
          }
        ]
      };

      await database.recordProcessingHistory(historyData);

      // 履歴取得
      const history = await database.getProcessingHistory(client.id);
      expect(history).toHaveLength(1);
      expect(history[0].totalFiles).toBe(2);
      expect(history[0].successCount).toBe(1);
      expect(history[0].failureCount).toBe(1);
    });
  });

  describe('エラーハンドリング実証テスト', () => {
    test('存在しないファイルのリネーム試行', async () => {
      const nonexistentFile = path.join(sourceDir, 'nonexistent.pdf');

      const result = await fileRenamer.renameFile({
        fileId: 'test-id',
        oldPath: nonexistentFile,
        newName: '0001_test.pdf',
        targetFolder: targetDir
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source file not found');
    });

    test('権限のないディレクトリへのファイル移動', async () => {
      const sourceFile = path.join(sourceDir, 'test.pdf');
      await fs.writeFile(sourceFile, 'テスト');

      // 存在しない権限のないパス（Windows）
      const restrictedDir = 'C:\\Windows\\System32\\restricted';

      const result = await fileRenamer.renameFile({
        fileId: 'test-id',
        oldPath: sourceFile,
        newName: '0001_test.pdf',
        targetFolder: restrictedDir
      });

      // 権限エラーまたは作成エラーで失敗することを確認
      expect(result.success).toBe(false);
    });
  });

  describe('パフォーマンステスト', () => {
    test('100ファイル処理の性能確認', async () => {
      // 100個のテストファイルを作成
      const files = [];
      for (let i = 0; i < 100; i++) {
        const fileName = `test_file_${i.toString().padStart(3, '0')}.pdf`;
        const filePath = path.join(sourceDir, fileName);
        await fs.writeFile(filePath, `テストファイル ${i}`);
        files.push({
          fileId: `test-${i}`,
          oldPath: filePath,
          newName: `${(i % 10).toString().padStart(4, '0')}_テスト_2407.pdf`,
          targetFolder: targetDir
        });
      }

      // 処理時間を測定
      const startTime = Date.now();
      const results = await fileRenamer.batchRename(files);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      console.log(`100ファイル処理時間: ${processingTime}ms`);

      // 結果確認
      expect(results).toHaveLength(100);
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(90); // 90%以上の成功率

      // 性能要件: 100ファイルを5秒以内
      expect(processingTime).toBeLessThan(5000);
    });
  });

  describe('文字エンコーディングテスト', () => {
    test('日本語ファイル名の正しい処理', async () => {
      const japaneseFileName = '法人税及び地方法人税申告書_株式会社テスト.pdf';
      const sourceFile = path.join(sourceDir, japaneseFileName);
      await fs.writeFile(sourceFile, 'テスト用');

      const result = await fileRenamer.renameFile({
        fileId: 'japanese-test',
        oldPath: sourceFile,
        newName: '0001_法人税申告書_2407.pdf',
        targetFolder: targetDir
      });

      expect(result.success).toBe(true);
      expect(await fs.pathExists(result.newPath)).toBe(true);

      // ファイル内容が保持されているか確認
      const content = await fs.readFile(result.newPath, 'utf-8');
      expect(content).toBe('テスト用');
    });
  });
});