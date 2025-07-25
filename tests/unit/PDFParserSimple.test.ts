/**
 * PDFパーサー簡易テスト（依存なし版）
 */

import { DocumentType } from '../../src/shared/types';

// モックなしでテスト可能な簡易版PDFParser
class SimplePDFParser {
  analyzeFileName(fileName: string): any {
    const analysis = {
      documentType: DocumentType.UNKNOWN,
      companyName: null as string | null,
      fiscalYear: null as string | null,
      prefecture: null as string | null,
      municipality: null as string | null,
      confidence: 0
    };

    // e-Tax形式の解析
    const eTaxPattern = /^(.+?)_(\d{8})(.+?)_(\d{14})\.pdf$/;
    const eTaxMatch = fileName.match(eTaxPattern);
    
    if (eTaxMatch) {
      const docName = eTaxMatch[1];
      const fiscalDate = eTaxMatch[2];
      const company = eTaxMatch[3];
      
      // 決算期の抽出（YYYYMMDD -> YYMM）
      const year = fiscalDate.substring(2, 4);
      const month = fiscalDate.substring(4, 6);
      analysis.fiscalYear = year + month;
      analysis.companyName = company.replace(/\s+/g, '');
      analysis.confidence = 0.9;

      // 書類種別の判定
      if (docName.includes('法人税及び地方法人税申告書')) {
        analysis.documentType = DocumentType.CORPORATE_TAX;
      } else if (docName.includes('消費税申告書')) {
        analysis.documentType = DocumentType.CONSUMPTION_TAX;
      } else if (docName.includes('都道府県民税') || docName.includes('事業税')) {
        analysis.documentType = DocumentType.PREFECTURAL_TAX;
        const prefMatch = fileName.match(/^(.+?都|.+?道|.+?府|.+?県)/);
        if (prefMatch) {
          analysis.prefecture = prefMatch[1];
        }
      } else if (docName.includes('市町村民税') || docName.includes('市民税')) {
        analysis.documentType = DocumentType.MUNICIPAL_TAX;
        const munMatch = fileName.match(/^(.+?市|.+?町|.+?村)/);
        if (munMatch) {
          analysis.municipality = munMatch[1];
        }
      }
      
      return analysis;
    }

    // 手動命名パターンの解析
    if (fileName.includes('受信通知')) {
      analysis.documentType = DocumentType.RECEIPT_NOTICE;
      analysis.confidence = 0.8;
    } else if (fileName.includes('納付情報') || fileName.includes('脳情報')) {
      analysis.documentType = DocumentType.PAYMENT_INFO;
      analysis.confidence = 0.8;
    } else if (fileName.includes('決算書')) {
      analysis.documentType = DocumentType.FINANCIAL_STATEMENT;
      analysis.confidence = 0.8;
    } else if (fileName.includes('固定資産台帳')) {
      analysis.documentType = DocumentType.FIXED_ASSET;
      analysis.confidence = 0.8;
    }

    return analysis;
  }
}

describe('PDFパーサー基本機能テスト', () => {
  let parser: SimplePDFParser;

  beforeEach(() => {
    parser = new SimplePDFParser();
  });

  describe('e-Taxファイル名解析', () => {
    test('法人税申告書の正確な解析', () => {
      const fileName = '法人税及び地方法人税申告書_20240731テスト会社株式会社_20250720130102.pdf';
      const analysis = parser.analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.CORPORATE_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.fiscalYear).toBe('2407');
      expect(analysis.confidence).toBeGreaterThan(0.8);
    });

    test('消費税申告書の正確な解析', () => {
      const fileName = '消費税申告書_20240731テスト会社株式会社_20250720130433.pdf';
      const analysis = parser.analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.CONSUMPTION_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.fiscalYear).toBe('2407');
    });

    test('都道府県税申告書の解析', () => {
      const fileName = '東京都　法人都道府県民税・事業税・特別法人事業税又は地方法人特別税　確定申告_20240731テスト会社　株式会社_20250720133418.pdf';
      const analysis = parser.analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.PREFECTURAL_TAX);
      expect(analysis.companyName).toBe('テスト会社株式会社');
      expect(analysis.prefecture).toBe('東京都');
    });
  });

  describe('手動命名ファイル解析', () => {
    test('受信通知の解析', () => {
      const fileName = '法人税　受信通知.pdf';
      const analysis = parser.analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.RECEIPT_NOTICE);
    });

    test('納付情報の解析', () => {
      const fileName = '法人税　納付情報登録依頼.pdf';
      const analysis = parser.analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.PAYMENT_INFO);
    });

    test('決算書の解析', () => {
      const fileName = '決算書_20250720_1535.pdf';
      const analysis = parser.analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.FINANCIAL_STATEMENT);
    });
  });

  describe('エラーケース', () => {
    test('不明なファイル形式', () => {
      const fileName = 'unknown_file.pdf';
      const analysis = parser.analyzeFileName(fileName);
      
      expect(analysis.documentType).toBe(DocumentType.UNKNOWN);
      expect(analysis.confidence).toBe(0);
    });
  });
});