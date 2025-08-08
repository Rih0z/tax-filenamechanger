import { DocumentType } from '../../shared/types';
import {
  RECEIPT_NOTICE_CODES,
  PAYMENT_INFO_CODES,
  PREFECTURE_CODES,
  CITY_CODES
} from '../../shared/constants/regionCodes';
import { Logger } from '../utils/logger';

export interface NumberAssignmentParams {
  documentType: DocumentType;
  region?: string;
  taxType?: string;
  fileName?: string;
}

export class DocumentNumberAssigner {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('DocumentNumberAssigner');
  }

  /**
   * 書類に適切な番号を割り当てる
   */
  assignNumber(params: NumberAssignmentParams): string {
    const { documentType, region, taxType, fileName } = params;
    
    this.logger.info(`Assigning number for: ${documentType}, region: ${region}, taxType: ${taxType}, fileName: ${fileName}`);
    
    // 受信通知の場合
    if (documentType === DocumentType.RECEIPT_NOTICE) {
      return this.assignReceiptNoticeNumber(region, taxType, fileName);
    }
    
    // 納付情報の場合
    if (documentType === DocumentType.PAYMENT_INFO) {
      return this.assignPaymentInfoNumber(region, taxType);
    }
    
    // 都道府県税申告書の場合
    if (documentType === DocumentType.PREFECTURAL_TAX && region) {
      return this.assignPrefecturalTaxNumber(region);
    }
    
    // 市民税申告書の場合
    if (documentType === DocumentType.MUNICIPAL_TAX && region) {
      return this.assignMunicipalTaxNumber(region);
    }
    
    // 添付資料の場合
    if (documentType === DocumentType.ATTACHMENT) {
      return this.assignAttachmentNumber(fileName);
    }
    
    // その他の書類の番号割り当て
    return this.assignDefaultNumber(documentType);
  }

  /**
   * 受信通知の番号割り当て
   */
  private assignReceiptNoticeNumber(region?: string, taxType?: string, fileName?: string): string {
    // 仮保存通知は特別扱い
    if (fileName && fileName.includes('仮保存')) {
      return '0005';
    }
    
    // 地域または税目に基づいて番号を割り当て
    if (region && RECEIPT_NOTICE_CODES[region]) {
      return RECEIPT_NOTICE_CODES[region];
    }
    
    if (taxType && RECEIPT_NOTICE_CODES[taxType]) {
      return RECEIPT_NOTICE_CODES[taxType];
    }
    
    // デフォルト（法人税の受信通知）
    return '0003';
  }

  /**
   * 納付情報の番号割り当て
   */
  private assignPaymentInfoNumber(region?: string, taxType?: string): string {
    // 税目に基づいて番号を割り当て
    if (taxType && PAYMENT_INFO_CODES[taxType]) {
      return PAYMENT_INFO_CODES[taxType];
    }
    
    // デフォルト（法人税の納付情報）
    return '0004';
  }

  /**
   * 都道府県税申告書の番号割り当て
   */
  private assignPrefecturalTaxNumber(region: string): string {
    if (PREFECTURE_CODES[region]) {
      return PREFECTURE_CODES[region];
    }
    
    // デフォルト
    return '1000';
  }

  /**
   * 市民税申告書の番号割り当て
   */
  private assignMunicipalTaxNumber(region: string): string {
    if (CITY_CODES[region]) {
      return CITY_CODES[region];
    }
    
    // デフォルト
    return '2000';
  }

  /**
   * 添付資料の番号割り当て
   */
  private assignAttachmentNumber(fileName?: string): string {
    if (fileName && fileName.includes('消費税')) {
      return '3002';
    }
    return '0002';
  }

  /**
   * デフォルトの番号割り当て
   */
  private assignDefaultNumber(documentType: DocumentType): string {
    const defaultNumbers: Partial<Record<DocumentType, string>> = {
      [DocumentType.CORPORATE_TAX]: '0001',
      [DocumentType.CONSUMPTION_TAX]: '3001',
      [DocumentType.PREFECTURAL_TAX]: '1000',
      [DocumentType.MUNICIPAL_TAX]: '2000',
      [DocumentType.RECEIPT_NOTICE]: '0003',
      [DocumentType.PAYMENT_INFO]: '0004',
      [DocumentType.FINANCIAL_STATEMENT]: '5001',
      [DocumentType.FIXED_ASSET]: '6000',
      [DocumentType.FIXED_ASSET_LEDGER]: '6001',
      [DocumentType.LUMP_SUM_DEPRECIATION]: '6002',
      [DocumentType.SMALL_AMOUNT_DEPRECIATION]: '6003',
      [DocumentType.TAX_PAYMENT_LIST]: '0000',
      [DocumentType.TAX_CLASSIFICATION]: '7001',
      [DocumentType.ATTACHMENT]: '0002',
      [DocumentType.JOURNAL]: '5005',
      [DocumentType.GENERAL_LEDGER]: '5002',
      [DocumentType.SUBSIDIARY_LEDGER]: '5003',
      [DocumentType.JOURNAL_DATA]: '5006'
    };
    
    return defaultNumbers[documentType] || '9999';
  }

  /**
   * 推奨ファイル名の生成
   */
  generateRecommendedName(
    params: NumberAssignmentParams & { 
      periodCode: string;
      originalExtension: string;
    }
  ): string {
    const number = this.assignNumber(params);
    const { documentType, region, periodCode, originalExtension, fileName } = params;
    
    // 書類名の生成
    let documentName = this.getDocumentName(documentType, region);
    
    // ファイル名の組み立て
    const recommendedName = `${number}_${documentName}_${periodCode}${originalExtension}`;
    
    this.logger.info(`Generated recommended name: ${recommendedName}`);
    
    return recommendedName;
  }

  /**
   * 書類名の取得
   */
  private getDocumentName(documentType: DocumentType, region?: string): string {
    // 地域別の書類名が必要な場合
    if (region && (
      documentType === DocumentType.PREFECTURAL_TAX || 
      documentType === DocumentType.MUNICIPAL_TAX
    )) {
      return `${region}_${documentType}`;
    }
    
    // 添付資料の場合は簡潔に
    if (documentType === DocumentType.ATTACHMENT) {
      return '添付資料';
    }
    
    // その他はDocumentTypeの値をそのまま使用
    return documentType;
  }
}