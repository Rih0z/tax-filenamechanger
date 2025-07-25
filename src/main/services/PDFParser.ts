import fs from 'fs-extra';
import pdfParse from 'pdf-parse';
import path from 'path';
import { ParsedDocument, DocumentType } from '@shared/types';
import { APP_CONFIG } from '@shared/constants/config';
import { Logger } from '../utils/logger';

export class PDFParser {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PDFParser');
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    this.logger.info(`Parsing PDF: ${filePath}`);

    try {
      // PDFファイルの読み込み
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      // ファイル名から情報を抽出
      const fileName = path.basename(filePath);
      const fileNameAnalysis = this.analyzeFileName(fileName);

      // PDF内容から情報を抽出
      const textAnalysis = this.analyzeText(data.text);

      // 解析結果を統合
      const analysis = this.mergeAnalysis(fileNameAnalysis, textAnalysis);

      // 推奨ファイル名を生成
      const suggestedName = this.generateSuggestedName(analysis);

      const result: ParsedDocument = {
        originalName: fileName,
        extractedText: data.text,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          creationDate: data.info?.CreationDate
        },
        analysis,
        suggestedName
      };

      this.logger.info(`PDF parsed successfully: ${fileName}`);
      return result;

    } catch (error) {
      this.logger.error(`Error parsing PDF ${filePath}:`, error);
      throw error;
    }
  }

  private analyzeFileName(fileName: string): Partial<ParsedDocument['analysis']> {
    const analysis: Partial<ParsedDocument['analysis']> = {
      confidence: 0
    };

    // e-Tax/eLTAXの命名パターン
    // 例: 法人税及び地方法人税申告書_20240731[法人名]_20250720130102.pdf
    const eTaxPattern = /^(.+?)_(\d{8})(.+?)_(\d{14})\.pdf$/;
    const match = fileName.match(eTaxPattern);

    if (match) {
      const [, docType, fiscalDate, companyName] = match;
      
      // 書類種別の判定
      analysis.documentType = this.determineDocumentType(docType);
      
      // 会社名の抽出（「株式会社」を正規化）
      analysis.companyName = this.normalizeCompanyName(companyName);
      
      // 決算期の抽出（YYYYMMDD -> YYMM）
      if (fiscalDate.length === 8) {
        const year = fiscalDate.substring(2, 4);
        const month = fiscalDate.substring(4, 6);
        analysis.fiscalYear = year + month;
      }
      
      analysis.confidence = 0.9;
    } else {
      // 手動命名パターン（例: 法人税 受信通知.pdf）
      analysis.documentType = this.determineDocumentTypeFromSimpleName(fileName);
      analysis.confidence = 0.5;
    }

    return analysis;
  }

  private analyzeText(text: string): Partial<ParsedDocument['analysis']> {
    const analysis: Partial<ParsedDocument['analysis']> = {
      confidence: 0
    };

    // テキストから会社名を抽出
    const companyPattern = /(?:株式会社|有限会社|合同会社|合資会社)[\s]*([^\s\n]+)/;
    const companyMatch = text.match(companyPattern);
    if (companyMatch) {
      analysis.companyName = companyMatch[0];
    }

    // 提出日を抽出
    const datePattern = /(?:提出日|申告日|作成日)[\s:：]*(\d{4}年\d{1,2}月\d{1,2}日)/;
    const dateMatch = text.match(datePattern);
    if (dateMatch) {
      analysis.submissionDate = this.normalizeDate(dateMatch[1]);
    }

    // 事業年度を抽出
    const fiscalYearPattern = /事業年度[\s:：]*(?:自[\s]*)?(\d{4}年\d{1,2}月\d{1,2}日)[\s]*(?:至[\s]*)?(\d{4}年\d{1,2}月\d{1,2}日)/;
    const fiscalMatch = text.match(fiscalYearPattern);
    if (fiscalMatch) {
      const endDate = this.normalizeDate(fiscalMatch[2]);
      if (endDate) {
        const [year, month] = endDate.split('-');
        analysis.fiscalYear = year.substring(2) + month;
      }
    }

    return analysis;
  }

  private mergeAnalysis(
    fileNameAnalysis: Partial<ParsedDocument['analysis']>,
    textAnalysis: Partial<ParsedDocument['analysis']>
  ): ParsedDocument['analysis'] {
    // ファイル名の解析結果を優先し、不足分をテキスト解析で補完
    return {
      documentType: fileNameAnalysis.documentType || textAnalysis.documentType || DocumentType.UNKNOWN,
      companyName: fileNameAnalysis.companyName || textAnalysis.companyName,
      fiscalYear: fileNameAnalysis.fiscalYear || textAnalysis.fiscalYear,
      submissionDate: fileNameAnalysis.submissionDate || textAnalysis.submissionDate,
      confidence: Math.max(
        fileNameAnalysis.confidence || 0,
        textAnalysis.confidence || 0
      )
    };
  }

  private determineDocumentType(text: string): DocumentType {
    const normalizedText = text.toLowerCase();

    // パターンマッチングで書類種別を判定
    for (const [key, config] of Object.entries(APP_CONFIG.RENAME_PATTERNS)) {
      if ('patterns' in config) {
        for (const pattern of config.patterns) {
          if (pattern.test(text)) {
            return this.getDocumentTypeFromKey(key);
          }
        }
      }
    }

    return DocumentType.UNKNOWN;
  }

  private determineDocumentTypeFromSimpleName(fileName: string): DocumentType {
    if (fileName.includes('法人税') && fileName.includes('申告')) return DocumentType.CORPORATE_TAX;
    if (fileName.includes('消費税') && fileName.includes('申告')) return DocumentType.CONSUMPTION_TAX;
    if (fileName.includes('都道府県') || fileName.includes('事業税')) return DocumentType.PREFECTURAL_TAX;
    if (fileName.includes('市民税') || fileName.includes('市町村民税')) return DocumentType.MUNICIPAL_TAX;
    if (fileName.includes('受信通知')) return DocumentType.RECEIPT_NOTICE;
    if (fileName.includes('納付情報') || fileName.includes('納付区分')) return DocumentType.PAYMENT_INFO;
    if (fileName.includes('決算') || fileName.includes('財務諸表')) return DocumentType.FINANCIAL_STATEMENT;
    if (fileName.includes('固定資産')) return DocumentType.FIXED_ASSET;
    if (fileName.includes('税区分')) return DocumentType.TAX_CLASSIFICATION;
    
    return DocumentType.UNKNOWN;
  }

  private getDocumentTypeFromKey(key: string): DocumentType {
    const typeMap: Record<string, DocumentType> = {
      'CORPORATE_TAX': DocumentType.CORPORATE_TAX,
      'CONSUMPTION_TAX': DocumentType.CONSUMPTION_TAX,
      'PREFECTURAL_TAX': DocumentType.PREFECTURAL_TAX,
      'MUNICIPAL_TAX': DocumentType.MUNICIPAL_TAX,
      'CORPORATE_TAX_RECEIPT': DocumentType.RECEIPT_NOTICE,
      'CONSUMPTION_TAX_RECEIPT': DocumentType.RECEIPT_NOTICE,
      'CORPORATE_TAX_PAYMENT': DocumentType.PAYMENT_INFO,
      'CONSUMPTION_TAX_PAYMENT': DocumentType.PAYMENT_INFO,
      'FINANCIAL_STATEMENT': DocumentType.FINANCIAL_STATEMENT,
      'FIXED_ASSET': DocumentType.FIXED_ASSET,
      'TAX_CLASSIFICATION': DocumentType.TAX_CLASSIFICATION,
      'TAX_SUMMARY': DocumentType.TAX_CLASSIFICATION
    };

    return typeMap[key] || DocumentType.UNKNOWN;
  }

  private normalizeCompanyName(name: string): string {
    // 全角スペースを除去し、表記を統一
    return name
      .replace(/\s+/g, '')
      .replace(/（/g, '(')
      .replace(/）/g, ')')
      .trim();
  }

  private normalizeDate(dateStr: string): string | undefined {
    // 和暦から西暦への変換（簡易版）
    const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return undefined;
  }

  private generateSuggestedName(analysis: ParsedDocument['analysis']): string {
    const prefix = this.getPrefix(analysis.documentType);
    const docTypeName = this.getDocumentTypeName(analysis.documentType);
    const fiscalYear = analysis.fiscalYear || 'XXXX';
    
    return `${prefix}_${docTypeName}_${fiscalYear}.pdf`;
  }

  private getPrefix(documentType: DocumentType): string {
    const prefixMap: Record<DocumentType, string> = {
      [DocumentType.CORPORATE_TAX]: '0001',
      [DocumentType.CONSUMPTION_TAX]: '3001',
      [DocumentType.PREFECTURAL_TAX]: '1000',
      [DocumentType.MUNICIPAL_TAX]: '2000',
      [DocumentType.RECEIPT_NOTICE]: '0003',
      [DocumentType.PAYMENT_INFO]: '0004',
      [DocumentType.FINANCIAL_STATEMENT]: '5001',
      [DocumentType.FIXED_ASSET]: '6001',
      [DocumentType.TAX_CLASSIFICATION]: '7001',
      [DocumentType.UNKNOWN]: '9999'
    };

    return prefixMap[documentType];
  }

  private getDocumentTypeName(documentType: DocumentType): string {
    const nameMap: Record<DocumentType, string> = {
      [DocumentType.CORPORATE_TAX]: '法人税及び地方法人税申告書',
      [DocumentType.CONSUMPTION_TAX]: '消費税及び地方消費税申告書',
      [DocumentType.PREFECTURAL_TAX]: '都道府県税申告書',
      [DocumentType.MUNICIPAL_TAX]: '市民税申告書',
      [DocumentType.RECEIPT_NOTICE]: '受信通知',
      [DocumentType.PAYMENT_INFO]: '納付情報',
      [DocumentType.FINANCIAL_STATEMENT]: '決算書',
      [DocumentType.FIXED_ASSET]: '固定資産台帳',
      [DocumentType.TAX_CLASSIFICATION]: '税区分集計表',
      [DocumentType.UNKNOWN]: '不明な書類'
    };

    return nameMap[documentType];
  }
}