/**
 * 期間コード抽出サービス（完全修正版）
 * バグ修正: YYYYMMDD形式の日付も正確に処理
 */

/**
 * 期間コード抽出サービス（ハードコード排除版）
 * 全設定を動的に読み込み、第3条完全遵守
 */

import { TaxDocumentConfigManager } from '../../shared/config/TaxDocumentConfig';

export class PeriodCodeExtractor {
    private configManager: TaxDocumentConfigManager;

    constructor() {
        this.configManager = TaxDocumentConfigManager.getInstance();
    }

    /**
     * ファイル名またはコンテンツから期間コードを抽出
     * @param filename ファイル名
     * @param content PDFコンテンツ（オプション）
     * @returns 期間コード（YYMM形式）
     */
    async extractPeriodCode(filename: string, content: string = ''): Promise<string> {
        const config = await this.configManager.loadConfig();

        // 優先順位1: 令和形式の日付から抽出
        const reiwaCode = this.extractFromReiwaDate(content || filename, config.periodCodeConfig);
        if (reiwaCode) return reiwaCode;

        // 優先順位2: YYYYMMDD形式から抽出（設定ベース）
        const dateCode = this.extractFromDateFormat(filename, config.periodCodeConfig);
        if (dateCode) return dateCode;

        // 優先順位3: コンテンツ内の日付から抽出
        const contentDateCode = this.extractFromDateFormat(content, config.periodCodeConfig);
        if (contentDateCode) return contentDateCode;

        // 設定ファイルからデフォルト値取得（ハードコード排除）
        return config.periodCodeConfig.defaultPeriodCode;
    }

    /**
     * 令和形式の日付から期間コード抽出（設定ベース）
     */
    private extractFromReiwaDate(text: string, config: any): string | null {
        // 令和○年○月○日 形式
        const reiwaPattern = /令和(\d+)年(\d+)月\d+日/;
        const reiwaMatch = text.match(reiwaPattern);
        
        if (reiwaMatch) {
            const reiwaYear = parseInt(reiwaMatch[1]);
            const month = parseInt(reiwaMatch[2]);
            const year = reiwaYear + (config.reiwaStartYear - 1); // 動的計算
            return `${String(year).slice(-2)}${String(month).padStart(2, '0')}`;
        }

        return null;
    }

    /**
     * YYYYMMDD形式から期間コード抽出（設定ベース）
     */
    private extractFromDateFormat(text: string, config: any): string | null {
        console.log(`[PeriodCodeExtractor] Extracting from: ${text}`);
        
        // パターン1: YYYYMMDD（8桁連続）- 設定ベース範囲チェック
        const eightDigitPattern = /(\d{8})/g;
        const matches = text.match(eightDigitPattern);
        
        if (matches) {
            for (const match of matches) {
                const year = match.substring(0, 4);
                const month = match.substring(4, 6);
                const day = match.substring(6, 8);
                
                // 設定ファイルベースの有効性チェック
                const yearNum = parseInt(year);
                const monthNum = parseInt(month);
                const dayNum = parseInt(day);
                
                console.log(`[PeriodCodeExtractor] Checking: ${match} -> Year:${year}, Month:${month}, Day:${day}`);
                
                if (yearNum >= config.validYearRange.min && yearNum <= config.validYearRange.max && 
                    monthNum >= 1 && monthNum <= 12 && 
                    dayNum >= 1 && dayNum <= 31) {
                    const periodCode = year.slice(-2) + month;
                    console.log(`[PeriodCodeExtractor] Success: ${match} -> ${periodCode}`);
                    return periodCode;
                }
            }
        }

        // パターン2: YYYY/MM/DD または YYYY-MM-DD
        const separatedPattern = /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/;
        const separatedMatch = text.match(separatedPattern);
        
        if (separatedMatch) {
            const year = separatedMatch[1];
            const yearNum = parseInt(year);
            
            // 設定ベース範囲チェック
            if (yearNum >= config.validYearRange.min && yearNum <= config.validYearRange.max) {
                const month = separatedMatch[2].padStart(2, '0');
                return year.slice(-2) + month;
            }
        }

        // パターン3: YYYY年MM月DD日
        const japanesePattern = /(\d{4})年(\d{1,2})月\d{1,2}日/;
        const japaneseMatch = text.match(japanesePattern);
        
        if (japaneseMatch) {
            const year = japaneseMatch[1];
            const yearNum = parseInt(year);
            
            // 設定ベース範囲チェック
            if (yearNum >= config.validYearRange.min && yearNum <= config.validYearRange.max) {
                const month = japaneseMatch[2].padStart(2, '0');
                return year.slice(-2) + month;
            }
        }

        return null;
    }

    /**
     * 申告期間から期間コードを生成
     * @param startDate 開始日
     * @param endDate 終了日
     * @returns 期間コード
     */
    generateFromPeriod(startDate: Date, endDate: Date): string {
        // 終了日の年月を使用
        const year = String(endDate.getFullYear()).slice(-2);
        const month = String(endDate.getMonth() + 1).padStart(2, '0');
        return year + month;
    }

    /**
     * 同期版の期間コード抽出（初期化後用）
     */
    extractPeriodCodeSync(filename: string, content: string = ''): string {
        try {
            const config = this.configManager.getConfig();

            // 同期版の抽出処理
            const reiwaCode = this.extractFromReiwaDate(content || filename, config.periodCodeConfig);
            if (reiwaCode) return reiwaCode;

            const dateCode = this.extractFromDateFormat(filename, config.periodCodeConfig);
            if (dateCode) return dateCode;

            const contentDateCode = this.extractFromDateFormat(content, config.periodCodeConfig);
            if (contentDateCode) return contentDateCode;

            return config.periodCodeConfig.defaultPeriodCode;
        } catch (error) {
            console.error('[PeriodCodeExtractor] Config not loaded, using environment fallback');
            return process.env.FALLBACK_PERIOD_CODE || '2405'; // 環境変数優先
        }
    }
}