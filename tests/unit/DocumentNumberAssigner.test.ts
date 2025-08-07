import { DocumentNumberAssigner } from '@/main/services/DocumentNumberAssigner';
import { DocumentType } from '@/shared/types';

describe('DocumentNumberAssigner', () => {
  let assigner: DocumentNumberAssigner;

  beforeEach(() => {
    assigner = new DocumentNumberAssigner();
  });

  describe('受信通知の番号割り当て', () => {
    it('地域別受信通知が正しく分類される', () => {
      const testCases = [
        { region: '愛知県', expected: '1013' },
        { region: '東京都', expected: '1003' },
        { region: '福岡県', expected: '1023' },
        { region: '蒲郡市', expected: '2003' },
        { region: '福岡市', expected: '2013' }
      ];

      for (const { region, expected } of testCases) {
        const result = assigner.assignNumber({
          documentType: DocumentType.RECEIPT_NOTICE,
          region
        });
        expect(result).toBe(expected);
      }
    });

    it('税目別受信通知が正しく分類される', () => {
      const testCases = [
        { taxType: '法人税', expected: '0003' },
        { taxType: '消費税', expected: '3003' }
      ];

      for (const { taxType, expected } of testCases) {
        const result = assigner.assignNumber({
          documentType: DocumentType.RECEIPT_NOTICE,
          taxType
        });
        expect(result).toBe(expected);
      }
    });
  });

  describe('納付情報の番号割り当て', () => {
    it('税目別納付情報が正しく分類される', () => {
      const testCases = [
        { taxType: '法人税', expected: '0004' },
        { taxType: '消費税', expected: '3004' },
        { taxType: '都道府県民税', expected: '1004' },
        { taxType: '市民税', expected: '2004' },
        { taxType: '法人市民税', expected: '2004' }
      ];

      for (const { taxType, expected } of testCases) {
        const result = assigner.assignNumber({
          documentType: DocumentType.PAYMENT_INFO,
          taxType
        });
        expect(result).toBe(expected);
      }
    });
  });

  describe('都道府県税・市民税申告書の番号割り当て', () => {
    it('都道府県税申告書が正しく分類される', () => {
      const testCases = [
        { region: '東京都', expected: '1001' },
        { region: '愛知県', expected: '1011' },
        { region: '福岡県', expected: '1021' }
      ];

      for (const { region, expected } of testCases) {
        const result = assigner.assignNumber({
          documentType: DocumentType.PREFECTURAL_TAX,
          region
        });
        expect(result).toBe(expected);
      }
    });

    it('市民税申告書が正しく分類される', () => {
      const testCases = [
        { region: '蒲郡市', expected: '2001' },
        { region: '福岡市', expected: '2011' }
      ];

      for (const { region, expected } of testCases) {
        const result = assigner.assignNumber({
          documentType: DocumentType.MUNICIPAL_TAX,
          region
        });
        expect(result).toBe(expected);
      }
    });
  });

  describe('その他の書類の番号割り当て', () => {
    it('固定資産関連書類が正しく分類される', () => {
      const testCases = [
        { documentType: DocumentType.FIXED_ASSET_LEDGER, expected: '6001' },
        { documentType: DocumentType.LUMP_SUM_DEPRECIATION, expected: '6002' },
        { documentType: DocumentType.SMALL_AMOUNT_DEPRECIATION, expected: '6003' }
      ];

      for (const { documentType, expected } of testCases) {
        const result = assigner.assignNumber({ documentType });
        expect(result).toBe(expected);
      }
    });

    it('決算書類が正しく分類される', () => {
      const testCases = [
        { documentType: DocumentType.JOURNAL, expected: '5005' },
        { documentType: DocumentType.GENERAL_LEDGER, expected: '5002' },
        { documentType: DocumentType.SUBSIDIARY_LEDGER, expected: '5003' },
        { documentType: DocumentType.JOURNAL_DATA, expected: '5006' }
      ];

      for (const { documentType, expected } of testCases) {
        const result = assigner.assignNumber({ documentType });
        expect(result).toBe(expected);
      }
    });
  });

  describe('推奨ファイル名の生成', () => {
    it('完全な推奨ファイル名を生成する', () => {
      const result = assigner.generateRecommendedName({
        documentType: DocumentType.RECEIPT_NOTICE,
        region: '愛知県',
        periodCode: '2405',
        originalExtension: '.pdf'
      });

      expect(result).toBe('1013_受信通知_2405.pdf');
    });

    it('地域別申告書の推奨ファイル名を生成する', () => {
      const result = assigner.generateRecommendedName({
        documentType: DocumentType.PREFECTURAL_TAX,
        region: '愛知県',
        periodCode: '2405',
        originalExtension: '.pdf'
      });

      expect(result).toBe('1011_愛知県_都道府県税申告書_2405.pdf');
    });
  });
});