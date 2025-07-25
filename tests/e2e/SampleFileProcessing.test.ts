/**
 * サンプルファイル処理実証テスト
 * sampleフォルダ内の実際のファイル名で正確なリネーム処理を検証
 */

import { PDFParser } from '../../src/main/services/PDFParser';
import { FileRenamer } from '../../src/main/services/FileRenamer';
import { DocumentType } from '../../src/shared/types';

// 実際のファイルシステムを使用するため、モックを無効化
jest.unmock('fs-extra');
jest.unmock('better-sqlite3');
jest.unmock('pdf-parse');

describe('サンプルファイル処理実証テスト', () => {
  let pdfParser: PDFParser;
  let fileRenamer: FileRenamer;

  beforeAll(() => {
    pdfParser = new PDFParser();
    fileRenamer = new FileRenamer();
  });

  describe('実際のサンプルファイル名解析テスト', () => {
    test('法人税及び地方法人税申告書の正確な解析', () => {
      const fileName = '法人税及び地方法人税申告書_20240731テスト会社株式会社_20250720130102.pdf';
      const analysis = (pdfParser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.CORPORATE_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.fiscalYear).toBe('2407');
      expect(analysis.confidence).toBeGreaterThan(0.8);

      // 推奨名生成確認
      const suggestedName = fileRenamer.generateSuggestedName(
        analysis.documentType,
        analysis.companyName,
        analysis.fiscalYear
      );
      expect(suggestedName).toBe('0001_法人税及び地方法人税申告書_2407.pdf');
    });

    test('消費税申告書の正確な解析', () => {
      const fileName = '消費税申告書_20240731テスト会社株式会社_20250720130433.pdf';
      const analysis = (pdfParser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.CONSUMPTION_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.fiscalYear).toBe('2407');

      const suggestedName = fileRenamer.generateSuggestedName(
        analysis.documentType,
        analysis.companyName,
        analysis.fiscalYear
      );
      expect(suggestedName).toBe('3001_消費税及び地方消費税申告書_2407.pdf');
    });

    test('東京都の都道府県税申告書の正確な解析', () => {
      const fileName = '東京都　法人都道府県民税・事業税・特別法人事業税又は地方法人特別税　確定申告_20240731テスト会社　株式会社_20250720133418.pdf';
      const analysis = (pdfParser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.PREFECTURAL_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.prefecture).toBe('東京都');
      expect(analysis.fiscalYear).toBe('2407');

      const suggestedName = fileRenamer.generateSuggestedName(
        analysis.documentType,
        analysis.companyName,
        analysis.fiscalYear,
        analysis.prefecture
      );
      expect(suggestedName).toBe('1000_都道府県税申告書_2407.pdf');
    });

    test('愛知県の都道府県税申告書の正確な解析', () => {
      const fileName = '愛知県　法人都道府県民税・事業税・特別法人事業税又は地方法人特別税　確定申告_20240731テスト会社　株式会社.pdf';
      const analysis = (pdfParser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.PREFECTURAL_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.prefecture).toBe('愛知県');
    });

    test('福岡市の市民税申告書の正確な解析', () => {
      const fileName = '福岡市　法人市町村民税　確定申告_20240731テスト会社　株式会社_20250720133028.pdf';
      const analysis = (pdfParser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.MUNICIPAL_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.municipality).toBe('福岡市');
      expect(analysis.fiscalYear).toBe('2407');

      const suggestedName = fileRenamer.generateSuggestedName(
        analysis.documentType,
        analysis.companyName,
        analysis.fiscalYear,
        undefined,
        analysis.municipality
      );
      expect(suggestedName).toBe('2000_市民税申告書_2407.pdf');
    });

    test('蒲郡市の市民税申告書の正確な解析', () => {
      const fileName = '蒲郡市　法人市町村民税　確定申告_20240731テスト会社　株式会社_20250720132131.pdf';
      const analysis = (pdfParser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.MUNICIPAL_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.municipality).toBe('蒲郡市');
      expect(analysis.fiscalYear).toBe('2407');
    });

    test('受信通知の正確な解析', () => {
      const testCases = [
        { fileName: '法人税　受信通知.pdf', expectedType: DocumentType.RECEIPT_NOTICE },
        { fileName: '消費税　受信通知.pdf', expectedType: DocumentType.RECEIPT_NOTICE },
        { fileName: '東京都　受信通知.pdf', expectedType: DocumentType.RECEIPT_NOTICE },
        { fileName: '愛知県　受信通知.pdf', expectedType: DocumentType.RECEIPT_NOTICE },
        { fileName: '福岡市受信通知.pdf', expectedType: DocumentType.RECEIPT_NOTICE },
        { fileName: '蒲郡市受信通知.pdf', expectedType: DocumentType.RECEIPT_NOTICE }
      ];

      for (const testCase of testCases) {
        const analysis = (pdfParser as any).analyzeFileName(testCase.fileName);
        expect(analysis.documentType).toBe(testCase.expectedType);
      }
    });

    test('納付情報の正確な解析', () => {
      const testCases = [
        { fileName: '法人税　納付情報登録依頼.pdf', expectedType: DocumentType.PAYMENT_INFO },
        { fileName: '消費税　納付情報登録依頼.pdf', expectedType: DocumentType.PAYMENT_INFO },
        { fileName: '法人市民税　脳情報.pdf', expectedType: DocumentType.PAYMENT_INFO },
        { fileName: '都道府県県民税　納付情報.pdf', expectedType: DocumentType.PAYMENT_INFO }
      ];

      for (const testCase of testCases) {
        const analysis = (pdfParser as any).analyzeFileName(testCase.fileName);
        expect(analysis.documentType).toBe(testCase.expectedType);
      }
    });

    test('決算書類の正確な解析', () => {
      const testCases = [
        { fileName: '決算書_20250720_1535.pdf', expectedType: DocumentType.FINANCIAL_STATEMENT },
        { fileName: '総勘定元帳_20250720_1537.pdf', expectedType: DocumentType.GENERAL_LEDGER },
        { fileName: '補助元帳_20250720_1537.pdf', expectedType: DocumentType.SUBSIDIARY_LEDGER },
        { fileName: '残高試算表_貸借対照表_損益計算書_20250720_1538.pdf', expectedType: DocumentType.BALANCE_SHEET },
        { fileName: '仕訳帳_20250720_1541.pdf', expectedType: DocumentType.JOURNAL },
        { fileName: '仕訳帳_20250720_1635.csv のコピー.csv', expectedType: DocumentType.JOURNAL_DATA }
      ];

      for (const testCase of testCases) {
        const analysis = (pdfParser as any).analyzeFileName(testCase.fileName);
        expect(analysis.documentType).toBe(testCase.expectedType);
      }
    });

    test('固定資産関連書類の正確な解析', () => {
      const testCases = [
        { fileName: '固定資産台帳.pdf', expectedType: DocumentType.FIXED_ASSET },
        { fileName: '一括償却資産明細.pdf', expectedType: DocumentType.BULK_DEPRECIATION },
        { fileName: '少額.pdf', expectedType: DocumentType.SMALL_AMOUNT_ASSET }
      ];

      for (const testCase of testCases) {
        const analysis = (pdfParser as any).analyzeFileName(testCase.fileName);
        expect(analysis.documentType).toBe(testCase.expectedType);
      }
    });

    test('税区分集計表の正確な解析', () => {
      const testCases = [
        { fileName: '勘定科目別税区分集計表_20250720_1539.pdf', expectedType: DocumentType.TAX_CLASSIFICATION_BY_ACCOUNT },
        { fileName: '税区分集計表_20250720_1540.pdf', expectedType: DocumentType.TAX_CLASSIFICATION }
      ];

      for (const testCase of testCases) {
        const analysis = (pdfParser as any).analyzeFileName(testCase.fileName);
        expect(analysis.documentType).toBe(testCase.expectedType);
      }
    });

    test('添付書類の正確な解析', () => {
      const testCases = [
        { fileName: 'イメージ添付書類(法人税申告)_20250331サンプル会社株式会社_20250721083608.pdf', 
          expectedType: DocumentType.CORPORATE_TAX_ATTACHMENT,
          expectedCompany: 'サンプル会社株式会社' },
        { fileName: 'イメージ添付書類(法人消費税申告)_20250115六興実業株式会社_20250721083729.pdf', 
          expectedType: DocumentType.CONSUMPTION_TAX_ATTACHMENT,
          expectedCompany: '六興実業株式会社' }
      ];

      for (const testCase of testCases) {
        const analysis = (pdfParser as any).analyzeFileName(testCase.fileName);
        expect(analysis.documentType).toBe(testCase.expectedType);
        if (testCase.expectedCompany) {
          expect(analysis.companyName).toBe(testCase.expectedCompany);
        }
      }
    });

    test('その他の書類の解析', () => {
      const fileName = '納税一覧.pdf';
      const analysis = (pdfParser as any).analyzeFileName(fileName);
      expect(analysis.documentType).toBe(DocumentType.TAX_PAYMENT_LIST);
    });
  });

  describe('推奨名生成パターンテスト', () => {
    test('全サンプルファイルの推奨名生成', () => {
      const testCases = [
        {
          originalName: '法人税及び地方法人税申告書_20240731テスト会社株式会社_20250720130102.pdf',
          expectedSuggestion: '0001_法人税及び地方法人税申告書_2407.pdf'
        },
        {
          originalName: '消費税申告書_20240731テスト会社株式会社_20250720130433.pdf',
          expectedSuggestion: '3001_消費税及び地方消費税申告書_2407.pdf'
        },
        {
          originalName: '東京都　法人都道府県民税・事業税・特別法人事業税又は地方法人特別税　確定申告_20240731テスト会社　株式会社_20250720133418.pdf',
          expectedSuggestion: '1000_都道府県税申告書_2407.pdf'
        },
        {
          originalName: '福岡市　法人市町村民税　確定申告_20240731テスト会社　株式会社_20250720133028.pdf',
          expectedSuggestion: '2000_市民税申告書_2407.pdf'
        },
        {
          originalName: '蒲郡市　法人市町村民税　確定申告_20240731テスト会社　株式会社_20250720132131.pdf',
          expectedSuggestion: '2000_市民税申告書_2407.pdf'
        },
        {
          originalName: '法人税　受信通知.pdf',
          expectedSuggestion: '0003_受信通知_2407.pdf'
        },
        {
          originalName: '法人税　納付情報登録依頼.pdf',
          expectedSuggestion: '0004_納付情報_2407.pdf'
        },
        {
          originalName: '決算書_20250720_1535.pdf',
          expectedSuggestion: '5001_決算書_2407.pdf'
        },
        {
          originalName: '総勘定元帳_20250720_1537.pdf',
          expectedSuggestion: '5002_総勘定元帳_2407.pdf'
        },
        {
          originalName: '固定資産台帳.pdf',
          expectedSuggestion: '6001_固定資産台帳_2407.pdf'
        },
        {
          originalName: '税区分集計表_20250720_1540.pdf',
          expectedSuggestion: '7001_税区分集計表_2407.pdf'
        }
      ];

      for (const testCase of testCases) {
        const analysis = (pdfParser as any).analyzeFileName(testCase.originalName);
        
        let suggestedName;
        if (analysis.documentType && analysis.companyName && analysis.fiscalYear) {
          suggestedName = fileRenamer.generateSuggestedName(
            analysis.documentType,
            analysis.companyName,
            analysis.fiscalYear,
            analysis.prefecture,
            analysis.municipality
          );
        } else if (analysis.documentType) {
          // 会社名や決算期が取れない場合のデフォルト値
          suggestedName = fileRenamer.generateSuggestedName(
            analysis.documentType,
            'テスト会社株式会社',
            '2407'
          );
        }

        expect(suggestedName).toBe(testCase.expectedSuggestion);
      }
    });
  });

  describe('番号体系適合性テスト', () => {
    test('0000番台：法人税・地方法人税関連', () => {
      const testCases = [
        { docType: DocumentType.CORPORATE_TAX, expectedPrefix: '0001' },
        { docType: DocumentType.CORPORATE_TAX_ATTACHMENT, expectedPrefix: '0002' },
        { docType: DocumentType.RECEIPT_NOTICE, expectedPrefix: '0003' },
        { docType: DocumentType.PAYMENT_INFO, expectedPrefix: '0004' },
        { docType: DocumentType.TAX_PAYMENT_LIST, expectedPrefix: '0000' }
      ];

      for (const testCase of testCases) {
        const suggestedName = fileRenamer.generateSuggestedName(
          testCase.docType,
          'テスト会社株式会社',
          '2407'
        );
        expect(suggestedName.startsWith(testCase.expectedPrefix)).toBe(true);
      }
    });

    test('1000番台：都道府県税関連', () => {
      const suggestedName = fileRenamer.generateSuggestedName(
        DocumentType.PREFECTURAL_TAX,
        'テスト会社株式会社',
        '2407'
      );
      expect(suggestedName.startsWith('1000')).toBe(true);
    });

    test('2000番台：市民税関連', () => {
      const suggestedName = fileRenamer.generateSuggestedName(
        DocumentType.MUNICIPAL_TAX,
        'テスト会社株式会社',
        '2407'
      );
      expect(suggestedName.startsWith('2000')).toBe(true);
    });

    test('3000番台：消費税関連', () => {
      const testCases = [
        { docType: DocumentType.CONSUMPTION_TAX, expectedPrefix: '3001' },
        { docType: DocumentType.CONSUMPTION_TAX_ATTACHMENT, expectedPrefix: '3002' }
      ];

      for (const testCase of testCases) {
        const suggestedName = fileRenamer.generateSuggestedName(
          testCase.docType,
          'テスト会社株式会社',
          '2407'
        );
        expect(suggestedName.startsWith(testCase.expectedPrefix)).toBe(true);
      }
    });

    test('5000番台：決算書類関連', () => {
      const testCases = [
        { docType: DocumentType.FINANCIAL_STATEMENT, expectedPrefix: '5001' },
        { docType: DocumentType.GENERAL_LEDGER, expectedPrefix: '5002' },
        { docType: DocumentType.SUBSIDIARY_LEDGER, expectedPrefix: '5003' },
        { docType: DocumentType.BALANCE_SHEET, expectedPrefix: '5004' },
        { docType: DocumentType.JOURNAL, expectedPrefix: '5005' },
        { docType: DocumentType.JOURNAL_DATA, expectedPrefix: '5006' }
      ];

      for (const testCase of testCases) {
        const suggestedName = fileRenamer.generateSuggestedName(
          testCase.docType,
          'テスト会社株式会社',
          '2407'
        );
        expect(suggestedName.startsWith(testCase.expectedPrefix)).toBe(true);
      }
    });

    test('6000番台：固定資産関連', () => {
      const testCases = [
        { docType: DocumentType.FIXED_ASSET, expectedPrefix: '6001' },
        { docType: DocumentType.BULK_DEPRECIATION, expectedPrefix: '6002' },
        { docType: DocumentType.SMALL_AMOUNT_ASSET, expectedPrefix: '6003' }
      ];

      for (const testCase of testCases) {
        const suggestedName = fileRenamer.generateSuggestedName(
          testCase.docType,
          'テスト会社株式会社',
          '2407'
        );
        expect(suggestedName.startsWith(testCase.expectedPrefix)).toBe(true);
      }
    });

    test('7000番台：税区分集計表関連', () => {
      const testCases = [
        { docType: DocumentType.TAX_CLASSIFICATION, expectedPrefix: '7001' },
        { docType: DocumentType.TAX_CLASSIFICATION_BY_ACCOUNT, expectedPrefix: '7002' }
      ];

      for (const testCase of testCases) {
        const suggestedName = fileRenamer.generateSuggestedName(
          testCase.docType,
          'テスト会社株式会社',
          '2407'
        );
        expect(suggestedName.startsWith(testCase.expectedPrefix)).toBe(true);
      }
    });
  });
});