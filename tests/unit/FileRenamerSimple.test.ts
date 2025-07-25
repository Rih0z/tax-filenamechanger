/**
 * ファイルリネーマー簡易テスト（依存なし版）
 */

import { DocumentType } from '../../src/shared/types';

// 簡易版FileRenamer
class SimpleFileRenamer {
  generateSuggestedName(
    docType: DocumentType, 
    companyName: string, 
    fiscalYear: string, 
    prefecture?: string, 
    municipality?: string
  ): string {
    const docTypeMap = {
      [DocumentType.CORPORATE_TAX]: { number: '0001', name: '法人税及び地方法人税申告書' },
      [DocumentType.RECEIPT_NOTICE]: { number: '0003', name: '受信通知' },
      [DocumentType.PAYMENT_INFO]: { number: '0004', name: '納付情報' },
      [DocumentType.PREFECTURAL_TAX]: { number: '1000', name: '都道府県税申告書' },
      [DocumentType.MUNICIPAL_TAX]: { number: '2000', name: '市民税申告書' },
      [DocumentType.CONSUMPTION_TAX]: { number: '3001', name: '消費税及び地方消費税申告書' },
      [DocumentType.FINANCIAL_STATEMENT]: { number: '5001', name: '決算書' },
      [DocumentType.FIXED_ASSET]: { number: '6001', name: '固定資産台帳' },
      [DocumentType.TAX_CLASSIFICATION]: { number: '7001', name: '税区分集計表' }
    };

    const mapping = docTypeMap[docType as keyof typeof docTypeMap];
    if (!mapping) {
      return '';
    }

    const extension = '.pdf'; // CSVは今回は簡単化のためPDFのみ
    return `${mapping.number}_${mapping.name}_${fiscalYear}${extension}`;
  }

  getCategoryFolder(fileName: string): string {
    const numberMatch = fileName.match(/^(\d{4})/);
    if (!numberMatch) {
      return 'その他';
    }

    const number = parseInt(numberMatch[1]);
    
    if (number >= 0 && number <= 999) {
      return '0000番台_法人税';
    } else if (number >= 1000 && number <= 1999) {
      return '1000番台_都道府県税';
    } else if (number >= 2000 && number <= 2999) {
      return '2000番台_市民税';
    } else if (number >= 3000 && number <= 3999) {
      return '3000番台_消費税';
    } else if (number >= 4000 && number <= 4999) {
      return '4000番台_事業所税';
    } else if (number >= 5000 && number <= 5999) {
      return '5000番台_決算書類';
    } else if (number >= 6000 && number <= 6999) {
      return '6000番台_固定資産';
    } else if (number >= 7000 && number <= 7999) {
      return '7000番台_税区分集計表';
    } else {
      return 'その他';
    }
  }

  isValidFileName(fileName: string): boolean {
    // ファイル名の長さチェック
    if (fileName.length > 250) {
      return false;
    }

    // 不正な文字のチェック
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(fileName)) {
      return false;
    }

    // サポートされている拡張子かチェック
    const supportedExtensions = ['.pdf', '.csv'];
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return supportedExtensions.includes(extension);
  }
}

describe('ファイルリネーマー基本機能テスト', () => {
  let renamer: SimpleFileRenamer;

  beforeEach(() => {
    renamer = new SimpleFileRenamer();
  });

  describe('推奨名生成テスト', () => {
    test('法人税申告書の推奨名を正しく生成する', () => {
      const result = renamer.generateSuggestedName(
        DocumentType.CORPORATE_TAX,
        'テスト会社株式会社',
        '2407'
      );
      
      expect(result).toBe('0001_法人税及び地方法人税申告書_2407.pdf');
    });

    test('消費税申告書の推奨名を正しく生成する', () => {
      const result = renamer.generateSuggestedName(
        DocumentType.CONSUMPTION_TAX,
        'サンプル会社株式会社',
        '2503'
      );
      
      expect(result).toBe('3001_消費税及び地方消費税申告書_2503.pdf');
    });

    test('都道府県税申告書の推奨名を生成する', () => {
      const result = renamer.generateSuggestedName(
        DocumentType.PREFECTURAL_TAX,
        'テスト会社株式会社',
        '2407'
      );
      
      expect(result).toBe('1000_都道府県税申告書_2407.pdf');
    });

    test('固定資産台帳の推奨名を生成する', () => {
      const result = renamer.generateSuggestedName(
        DocumentType.FIXED_ASSET,
        'テスト会社株式会社',
        '2407'
      );
      
      expect(result).toBe('6001_固定資産台帳_2407.pdf');
    });

    test('税区分集計表の推奨名を生成する', () => {
      const result = renamer.generateSuggestedName(
        DocumentType.TAX_CLASSIFICATION,
        'テスト会社株式会社',
        '2407'
      );
      
      expect(result).toBe('7001_税区分集計表_2407.pdf');
    });
  });

  describe('カテゴリフォルダ分類テスト', () => {
    test('0000番台のフォルダ分類が正しい', () => {
      const result = renamer.getCategoryFolder('0001_法人税申告書_2407.pdf');
      expect(result).toBe('0000番台_法人税');
    });

    test('1000番台のフォルダ分類が正しい', () => {
      const result = renamer.getCategoryFolder('1000_都道府県税申告書_2407.pdf');
      expect(result).toBe('1000番台_都道府県税');
    });

    test('2000番台のフォルダ分類が正しい', () => {
      const result = renamer.getCategoryFolder('2000_市民税申告書_2407.pdf');
      expect(result).toBe('2000番台_市民税');
    });

    test('3000番台のフォルダ分類が正しい', () => {
      const result = renamer.getCategoryFolder('3001_消費税申告書_2407.pdf');
      expect(result).toBe('3000番台_消費税');
    });

    test('5000番台のフォルダ分類が正しい', () => {
      const result = renamer.getCategoryFolder('5001_決算書_2407.pdf');
      expect(result).toBe('5000番台_決算書類');
    });

    test('6000番台のフォルダ分類が正しい', () => {
      const result = renamer.getCategoryFolder('6001_固定資産台帳_2407.pdf');
      expect(result).toBe('6000番台_固定資産');
    });

    test('7000番台のフォルダ分類が正しい', () => {
      const result = renamer.getCategoryFolder('7001_税区分集計表_2407.pdf');
      expect(result).toBe('7000番台_税区分集計表');
    });

    test('不正な番台の場合はその他フォルダに分類', () => {
      const result = renamer.getCategoryFolder('invalid_filename.pdf');
      expect(result).toBe('その他');
    });
  });

  describe('ファイル名バリデーションテスト', () => {
    test('有効なPDFファイル名を受け入れる', () => {
      const result = renamer.isValidFileName('0001_法人税申告書_2407.pdf');
      expect(result).toBe(true);
    });

    test('市民税申告書の推奨名を受け入れる', () => {
      const result = renamer.isValidFileName('2000_市民税申告書_2407.pdf');
      expect(result).toBe(true);
    });

    test('不正な文字を含むファイル名を拒否する', () => {
      const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];
      
      for (const char of invalidChars) {
        const fileName = `test${char}file.pdf`;
        const result = renamer.isValidFileName(fileName);
        expect(result).toBe(false);
      }
    });

    test('長すぎるファイル名を拒否する', () => {
      const longName = 'a'.repeat(256) + '.pdf';
      const result = renamer.isValidFileName(longName);
      expect(result).toBe(false);
    });

    test('サポートされていない拡張子を拒否する', () => {
      const result = renamer.isValidFileName('test.txt');
      expect(result).toBe(false);
    });
  });

  describe('番号体系適合性テスト', () => {
    test('すべての番号体系が正確に生成される', () => {
      const testCases = [
        { docType: DocumentType.CORPORATE_TAX, expectedPrefix: '0001' },
        { docType: DocumentType.RECEIPT_NOTICE, expectedPrefix: '0003' },
        { docType: DocumentType.PAYMENT_INFO, expectedPrefix: '0004' },
        { docType: DocumentType.PREFECTURAL_TAX, expectedPrefix: '1000' },
        { docType: DocumentType.MUNICIPAL_TAX, expectedPrefix: '2000' },
        { docType: DocumentType.CONSUMPTION_TAX, expectedPrefix: '3001' },
        { docType: DocumentType.FINANCIAL_STATEMENT, expectedPrefix: '5001' },
        { docType: DocumentType.FIXED_ASSET, expectedPrefix: '6001' },
        { docType: DocumentType.TAX_CLASSIFICATION, expectedPrefix: '7001' }
      ];

      for (const testCase of testCases) {
        const suggestedName = renamer.generateSuggestedName(
          testCase.docType,
          'テスト会社株式会社',
          '2407'
        );
        expect(suggestedName.startsWith(testCase.expectedPrefix)).toBe(true);
      }
    });
  });
});