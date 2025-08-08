import fs from 'fs-extra';
import pdfParse from 'pdf-parse';
import path from 'path';
import { ParsedDocument, DocumentType } from '../../shared/types';
import { APP_CONFIG } from '../../shared/constants/config';
import { REGION_PATTERNS, TAX_TYPE_PATTERNS } from '../../shared/constants/regionCodes';
import { Logger } from '../utils/logger';
import { DocumentNumberAssigner } from './DocumentNumberAssigner';
import { PDFTextAnalyzer } from './PDFTextAnalyzer';

export class PDFParser {
  private logger: Logger;
  private numberAssigner: DocumentNumberAssigner;
  private textAnalyzer: PDFTextAnalyzer;

  constructor() {
    this.logger = new Logger('PDFParser');
    this.numberAssigner = new DocumentNumberAssigner();
    this.textAnalyzer = new PDFTextAnalyzer();
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    this.logger.info(`Parsing PDF: ${filePath}`);

    try {
      // PDFファイルの読み込み
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      // ファイル名から情報を抽出
      const fileName = path.basename(filePath);
      const fileNameAnalysis = await this.analyzeFileName(fileName);

      // PDF内容から情報を抽出（手動命名ファイルの場合は詳細解析）
      let textAnalysis = this.analyzeText(data.text);
      
      // 手動命名ファイルの場合はPDFTextAnalyzerで詳細解析
      if ((fileNameAnalysis.confidence || 0) < 0.7) {
        const pdfAnalysis = await this.textAnalyzer.analyzeContent(filePath);
        if (pdfAnalysis.confidence > 0) {
          textAnalysis = {
            ...textAnalysis,
            documentType: pdfAnalysis.documentType || textAnalysis.documentType,
            region: pdfAnalysis.region || textAnalysis.region,
            taxType: pdfAnalysis.taxType || textAnalysis.taxType,
            companyName: pdfAnalysis.companyName || textAnalysis.companyName,
            periodCode: pdfAnalysis.periodCode || textAnalysis.periodCode
          };
        }
      }

      // 解析結果を統合
      const analysis = this.mergeAnalysis(fileNameAnalysis, textAnalysis);

      // 推奨ファイル名を生成
      const suggestedName = this.generateSuggestedName(analysis, fileName);

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

  private async analyzeFileName(fileName: string): Promise<Partial<ParsedDocument['analysis']>> {
    const analysis: Partial<ParsedDocument['analysis']> = {
      confidence: 0
    };
    
    // 地域と税目を検出
    const { region, taxType } = this.detectRegionAndTaxType(fileName);
    if (region) analysis.region = region;
    if (taxType) analysis.taxType = taxType;

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
      } else {
        // 手動ファイルの場合はデフォルト値
        analysis.fiscalYear = '2405';
      }
      
      analysis.confidence = 0.9;
    } else {
      // 手動命名パターン（例: 法人税 受信通知.pdf）
      analysis.documentType = this.determineDocumentTypeFromSimpleName(fileName);
      analysis.fiscalYear = '2405'; // 手動ファイルのデフォルト期間コード
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
      region: fileNameAnalysis.region || textAnalysis.region,
      taxType: fileNameAnalysis.taxType || textAnalysis.taxType,
      periodCode: textAnalysis.periodCode || fileNameAnalysis.fiscalYear || '2405',
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
    if (fileName.includes('受信通知')) return DocumentType.RECEIPT_NOTICE;
    if (fileName.includes('納付情報') || fileName.includes('納付区分') || fileName.includes('脳情報')) return DocumentType.PAYMENT_INFO;
    if (fileName.includes('一括償却')) return DocumentType.LUMP_SUM_DEPRECIATION;
    if (fileName.includes('少額')) return DocumentType.SMALL_AMOUNT_DEPRECIATION;
    if (fileName.includes('固定資産台帳')) return DocumentType.FIXED_ASSET_LEDGER;
    if (fileName.includes('納税一覧')) return DocumentType.TAX_PAYMENT_LIST;
    if (fileName.includes('法人税') && fileName.includes('申告')) return DocumentType.CORPORATE_TAX;
    if (fileName.includes('消費税') && fileName.includes('申告')) return DocumentType.CONSUMPTION_TAX;
    if (fileName.includes('都道府県') || fileName.includes('事業税')) return DocumentType.PREFECTURAL_TAX;
    if (fileName.includes('市民税') || fileName.includes('市町村民税')) return DocumentType.MUNICIPAL_TAX;
    if (fileName.includes('仕訳帳')) return DocumentType.JOURNAL;
    if (fileName.includes('総勘定元帳')) return DocumentType.GENERAL_LEDGER;
    if (fileName.includes('補助元帳')) return DocumentType.SUBSIDIARY_LEDGER;
    if (fileName.includes('仕訳') && fileName.includes('.csv')) return DocumentType.JOURNAL_DATA;
    if (fileName.includes('イメージ添付')) return DocumentType.ATTACHMENT;
    if (fileName.includes('決算') || fileName.includes('財務諸表')) return DocumentType.FINANCIAL_STATEMENT;
    if (fileName.includes('固定資産') && !fileName.includes('台帳')) return DocumentType.FIXED_ASSET;
    if (fileName.includes('税区分')) return DocumentType.TAX_CLASSIFICATION;
    
    return DocumentType.UNKNOWN;
  }

  /**
   * ファイル名から地域と税目を検出
   */
  private detectRegionAndTaxType(fileName: string): {
    region?: string;
    taxType?: string;
  } {
    let result: { region?: string; taxType?: string } = {};
    
    // 地域検出
    for (const { pattern, region } of REGION_PATTERNS) {
      if (pattern.test(fileName)) {
        result.region = region;
        break;
      }
    }
    
    // 税目検出
    for (const { pattern, taxType } of TAX_TYPE_PATTERNS) {
      if (pattern.test(fileName)) {
        result.taxType = taxType;
        break;
      }
    }
    
    return result;
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
      'FIXED_ASSET_LEDGER': DocumentType.FIXED_ASSET_LEDGER,
      'LUMP_SUM_DEPRECIATION': DocumentType.LUMP_SUM_DEPRECIATION,
      'SMALL_AMOUNT_DEPRECIATION': DocumentType.SMALL_AMOUNT_DEPRECIATION,
      'TAX_PAYMENT_LIST': DocumentType.TAX_PAYMENT_LIST,
      'TAX_CLASSIFICATION': DocumentType.TAX_CLASSIFICATION,
      'TAX_SUMMARY': DocumentType.TAX_CLASSIFICATION,
      'ATTACHMENT': DocumentType.ATTACHMENT,
      'JOURNAL': DocumentType.JOURNAL,
      'GENERAL_LEDGER': DocumentType.GENERAL_LEDGER,
      'SUBSIDIARY_LEDGER': DocumentType.SUBSIDIARY_LEDGER,
      'JOURNAL_DATA': DocumentType.JOURNAL_DATA
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

  private generateSuggestedName(analysis: ParsedDocument['analysis'], fileName?: string): string {
    // 拡張子の判定（元ファイル名がない場合はpdfをデフォルト）
    const extension = '.pdf';
    
    // DocumentNumberAssignerを使用して推奨ファイル名を生成
    const recommendedName = this.numberAssigner.generateRecommendedName({
      documentType: analysis.documentType,
      region: analysis.region,
      taxType: analysis.taxType,
      fileName: fileName,
      periodCode: analysis.fiscalYear || '2405',
      originalExtension: extension
    });
    
    return recommendedName;
  }

}