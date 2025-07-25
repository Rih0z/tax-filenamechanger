import { PDFParser } from '../../src/main/services/PDFParser';
import { DocumentType } from '../../src/shared/types';
import path from 'path';

describe('PDFParser', () => {
  let parser: PDFParser;

  beforeEach(() => {
    parser = new PDFParser();
  });

  describe('ファイル名解析テスト', () => {
    test('法人税申告書のe-Tax形式ファイル名を正しく解析する', () => {
      const fileName = '法人税及び地方法人税申告書_20240731テスト会社株式会社_20250720130102.pdf';
      const analysis = (parser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.CORPORATE_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.fiscalYear).toBe('2407');
      expect(analysis.confidence).toBe(0.9);
    });

    test('消費税申告書のe-Tax形式ファイル名を正しく解析する', () => {
      const fileName = '消費税申告書_20240731テスト会社株式会社_20250720130433.pdf';
      const analysis = (parser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.CONSUMPTION_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.fiscalYear).toBe('2407');
      expect(analysis.confidence).toBe(0.9);
    });

    test('都道府県税申告書（東京都）のファイル名を正しく解析する', () => {
      const fileName = '東京都　法人都道府県民税・事業税・特別法人事業税又は地方法人特別税　確定申告_20240731テスト会社　株式会社_20250720133418.pdf';
      const analysis = (parser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.PREFECTURAL_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.fiscalYear).toBe('2407');
    });

    test('市民税申告書（蒲郡市）のファイル名を正しく解析する', () => {
      const fileName = '蒲郡市　法人市町村民税　確定申告_20240731テスト会社　株式会社_20250720132131.pdf';
      const analysis = (parser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.MUNICIPAL_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.fiscalYear).toBe('2407');
    });

    test('手動命名ファイルの解析', () => {
      const fileName = '法人税　受信通知.pdf';
      const analysis = (parser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.RECEIPT_NOTICE);
      expect(analysis.confidence).toBe(0.5);
    });

    test('決算書類のファイル名を正しく解析する', () => {
      const fileName = '決算書_20250720_1535.pdf';
      const analysis = (parser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.FINANCIAL_STATEMENT);
    });

    test('固定資産台帳のファイル名を正しく解析する', () => {
      const fileName = '固定資産台帳.pdf';
      const analysis = (parser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.FIXED_ASSET);
    });

    test('不正なファイル名の場合', () => {
      const fileName = 'invalid_filename.pdf';
      const analysis = (parser as any).analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.UNKNOWN);
    });
  });

  describe('推奨ファイル名生成テスト', () => {
    test('法人税申告書の推奨名を正しく生成する', () => {
      const analysis = {
        documentType: DocumentType.CORPORATE_TAX,
        companyName: 'テスト会社株式会社',
        fiscalYear: '2407',
        submissionDate: '2025-07-20',
        confidence: 0.9
      };

      const suggestedName = (parser as any).generateSuggestedName(analysis);
      expect(suggestedName).toBe('0001_法人税及び地方法人税申告書_2407.pdf');
    });

    test('消費税申告書の推奨名を正しく生成する', () => {
      const analysis = {
        documentType: DocumentType.CONSUMPTION_TAX,
        companyName: 'テスト会社株式会社',
        fiscalYear: '2407',
        submissionDate: '2025-07-20',
        confidence: 0.9
      };

      const suggestedName = (parser as any).generateSuggestedName(analysis);
      expect(suggestedName).toBe('3001_消費税及び地方消費税申告書_2407.pdf');
    });

    test('受信通知の推奨名を正しく生成する', () => {
      const analysis = {
        documentType: DocumentType.RECEIPT_NOTICE,
        companyName: 'テスト会社株式会社',
        fiscalYear: '2407',
        confidence: 0.8
      };

      const suggestedName = (parser as any).generateSuggestedName(analysis);
      expect(suggestedName).toBe('0003_受信通知_2407.pdf');
    });

    test('納付情報の推奨名を正しく生成する', () => {
      const analysis = {
        documentType: DocumentType.PAYMENT_INFO,
        companyName: 'テスト会社株式会社',
        fiscalYear: '2407',
        confidence: 0.8
      };

      const suggestedName = (parser as any).generateSuggestedName(analysis);
      expect(suggestedName).toBe('0004_納付情報_2407.pdf');
    });

    test('決算書の推奨名を正しく生成する', () => {
      const analysis = {
        documentType: DocumentType.FINANCIAL_STATEMENT,
        fiscalYear: '2407',
        confidence: 0.7
      };

      const suggestedName = (parser as any).generateSuggestedName(analysis);
      expect(suggestedName).toBe('5001_決算書_2407.pdf');
    });

    test('固定資産台帳の推奨名を正しく生成する', () => {
      const analysis = {
        documentType: DocumentType.FIXED_ASSET,
        fiscalYear: '2407',
        confidence: 0.7
      };

      const suggestedName = (parser as any).generateSuggestedName(analysis);
      expect(suggestedName).toBe('6001_固定資産台帳_2407.pdf');
    });

    test('不明な書類の推奨名を生成する', () => {
      const analysis = {
        documentType: DocumentType.UNKNOWN,
        fiscalYear: 'XXXX',
        confidence: 0.1
      };

      const suggestedName = (parser as any).generateSuggestedName(analysis);
      expect(suggestedName).toBe('9999_不明な書類_XXXX.pdf');
    });
  });

  describe('書類種別判定テスト', () => {
    test('各種申告書の判定が正しい', () => {
      expect((parser as any).determineDocumentTypeFromSimpleName('法人税申告書.pdf')).toBe(DocumentType.CORPORATE_TAX);
      expect((parser as any).determineDocumentTypeFromSimpleName('消費税申告書.pdf')).toBe(DocumentType.CONSUMPTION_TAX);
      expect((parser as any).determineDocumentTypeFromSimpleName('都道府県税申告書.pdf')).toBe(DocumentType.PREFECTURAL_TAX);
      expect((parser as any).determineDocumentTypeFromSimpleName('市民税申告書.pdf')).toBe(DocumentType.MUNICIPAL_TAX);
    });

    test('各種通知・情報書類の判定が正しい', () => {
      expect((parser as any).determineDocumentTypeFromSimpleName('受信通知.pdf')).toBe(DocumentType.RECEIPT_NOTICE);
      expect((parser as any).determineDocumentTypeFromSimpleName('納付情報.pdf')).toBe(DocumentType.PAYMENT_INFO);
    });

    test('決算関連書類の判定が正しい', () => {
      expect((parser as any).determineDocumentTypeFromSimpleName('決算書.pdf')).toBe(DocumentType.FINANCIAL_STATEMENT);
      expect((parser as any).determineDocumentTypeFromSimpleName('固定資産台帳.pdf')).toBe(DocumentType.FIXED_ASSET);
      expect((parser as any).determineDocumentTypeFromSimpleName('税区分集計表.pdf')).toBe(DocumentType.TAX_CLASSIFICATION);
    });
  });

  describe('会社名正規化テスト', () => {
    test('会社名の正規化が正しく動作する', () => {
      expect((parser as any).normalizeCompanyName('テスト会社　株式会社')).toBe('テスト会社株式会社');
      expect((parser as any).normalizeCompanyName('サンプル会社株式会社')).toBe('サンプル会社株式会社');
      expect((parser as any).normalizeCompanyName('六興実業　株式会社')).toBe('六興実業株式会社');
    });
  });
});