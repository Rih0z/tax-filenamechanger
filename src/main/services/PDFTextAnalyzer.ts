import fs from 'fs-extra';
import pdfParse from 'pdf-parse';
import { DocumentType } from '@shared/types';
import { Logger } from '../utils/logger';

export interface PDFAnalysisResult {
  documentType?: DocumentType;
  region?: string;
  taxType?: string;
  periodCode?: string;
  companyName?: string;
  confidence: number;
}

export class PDFTextAnalyzer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PDFTextAnalyzer');
  }

  /**
   * PDFファイルの内容を解析
   */
  async analyzeContent(filePath: string): Promise<PDFAnalysisResult> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;
      
      this.logger.info(`Analyzing PDF content: ${filePath}`);
      
      const result: PDFAnalysisResult = {
        documentType: this.detectDocumentType(text),
        region: this.detectRegion(text),
        taxType: this.detectTaxType(text),
        periodCode: this.extractPeriodCode(text),
        companyName: this.extractCompanyName(text),
        confidence: 0
      };
      
      // 信頼度の計算
      let confidence = 0;
      if (result.documentType && result.documentType !== DocumentType.UNKNOWN) confidence += 30;
      if (result.region) confidence += 20;
      if (result.taxType) confidence += 20;
      if (result.periodCode) confidence += 20;
      if (result.companyName) confidence += 10;
      result.confidence = confidence;
      
      this.logger.info(`Analysis result: ${JSON.stringify(result)}`);
      
      return result;
    } catch (error) {
      this.logger.error(`PDF analysis error: ${error}`);
      return { confidence: 0 };
    }
  }

  /**
   * 書類種別の検出
   */
  private detectDocumentType(text: string): DocumentType | undefined {
    const patterns: Array<{ pattern: RegExp; type: DocumentType }> = [
      // 受信通知
      { pattern: /受信通知|申告受付完了通知/, type: DocumentType.RECEIPT_NOTICE },
      
      // 納付情報
      { pattern: /納付区分番号通知|納付情報/, type: DocumentType.PAYMENT_INFO },
      
      // 固定資産関連
      { pattern: /一括償却資産/, type: DocumentType.LUMP_SUM_DEPRECIATION },
      { pattern: /少額減価償却/, type: DocumentType.SMALL_AMOUNT_DEPRECIATION },
      { pattern: /固定資産台帳/, type: DocumentType.FIXED_ASSET_LEDGER },
      
      // 申告書
      { pattern: /法人税.*申告書/, type: DocumentType.CORPORATE_TAX },
      { pattern: /消費税.*申告書/, type: DocumentType.CONSUMPTION_TAX },
      { pattern: /都道府県民税.*申告書|事業税.*申告書/, type: DocumentType.PREFECTURAL_TAX },
      { pattern: /市町村民税.*申告書|市民税.*申告書/, type: DocumentType.MUNICIPAL_TAX },
      
      // その他
      { pattern: /納付税額一覧/, type: DocumentType.TAX_PAYMENT_LIST },
      { pattern: /税区分集計表/, type: DocumentType.TAX_CLASSIFICATION },
      { pattern: /添付書類|イメージ添付/, type: DocumentType.ATTACHMENT },
      { pattern: /仕訳帳/, type: DocumentType.JOURNAL },
      { pattern: /総勘定元帳/, type: DocumentType.GENERAL_LEDGER },
      { pattern: /補助元帳/, type: DocumentType.SUBSIDIARY_LEDGER },
      { pattern: /決算.*書|財務諸表/, type: DocumentType.FINANCIAL_STATEMENT }
    ];
    
    for (const { pattern, type } of patterns) {
      if (pattern.test(text)) {
        return type;
      }
    }
    
    return undefined;
  }

  /**
   * 地域の検出
   */
  private detectRegion(text: string): string | undefined {
    const regions = [
      '東京都', '愛知県', '福岡県',
      '蒲郡市', '福岡市',
      '大阪府', '神奈川県', '千葉県', '埼玉県'
    ];
    
    for (const region of regions) {
      if (text.includes(region)) {
        return region;
      }
    }
    
    return undefined;
  }

  /**
   * 税目の検出
   */
  private detectTaxType(text: string): string | undefined {
    // 法人税（都道府県税・市民税を除外）
    if (/法人税(?!.*都道府県|.*市)/.test(text)) return '法人税';
    
    // 消費税
    if (/消費税/.test(text)) return '消費税';
    
    // 都道府県民税
    if (/都道府県[県民]?税|都道府県県民税/.test(text)) return '都道府県民税';
    
    // 市民税
    if (/法人市[町村]?民税|市民税/.test(text)) return '市民税';
    
    return undefined;
  }

  /**
   * 期間コードの抽出
   */
  private extractPeriodCode(text: string): string {
    // パターン1: 令和形式
    const reiwaPattern = /令和(\d+)年(\d+)月\d+日/;
    const reiwaMatch = text.match(reiwaPattern);
    
    if (reiwaMatch) {
      const reiwaYear = parseInt(reiwaMatch[1]);
      const month = parseInt(reiwaMatch[2]);
      const year = reiwaYear + 2018; // 令和元年 = 2019年
      
      return `${String(year).slice(-2)}${String(month).padStart(2, '0')}`;
    }
    
    // パターン2: 西暦形式
    const seirekiPattern = /(\d{4})年(\d{1,2})月\d{1,2}日/;
    const seirekiMatch = text.match(seirekiPattern);
    
    if (seirekiMatch) {
      const year = parseInt(seirekiMatch[1]);
      const month = parseInt(seirekiMatch[2]);
      return `${String(year).slice(-2)}${String(month).padStart(2, '0')}`;
    }
    
    // パターン3: 事業年度
    const businessYearPattern = /事業年度.*?(\d{4})年(\d{1,2})月/;
    const businessMatch = text.match(businessYearPattern);
    
    if (businessMatch) {
      const year = parseInt(businessMatch[1]);
      const month = parseInt(businessMatch[2]);
      return `${String(year).slice(-2)}${String(month).padStart(2, '0')}`;
    }
    
    // デフォルト値（2024年5月期）
    return '2405';
  }

  /**
   * 会社名の抽出
   */
  private extractCompanyName(text: string): string | undefined {
    // パターン1: 「株式会社」を含む行
    const companyPattern = /([^、。\s]{2,}株式会社[^、。\s]*)/;
    const match = text.match(companyPattern);
    
    if (match) {
      return match[1].trim();
    }
    
    // パターン2: 「法人名」の後
    const namePattern = /法人名[：:]\s*([^、。\n]+)/;
    const nameMatch = text.match(namePattern);
    
    if (nameMatch) {
      return nameMatch[1].trim();
    }
    
    return undefined;
  }
}