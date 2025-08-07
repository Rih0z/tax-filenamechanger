/**
 * 期間コード抽出サービス（完全修正版）
 * バグ修正: YYYYMMDD形式の日付も正確に処理
 */

export class PeriodCodeExtractor {
    /**
     * ファイル名またはコンテンツから期間コードを抽出
     * @param filename ファイル名
     * @param content PDFコンテンツ（オプション）
     * @returns 期間コード（YYMM形式）
     */
    extractPeriodCode(filename: string, content: string = ''): string {
        // 優先順位1: 令和形式の日付から抽出
        const reiwaCode = this.extractFromReiwaDate(content || filename);
        if (reiwaCode) return reiwaCode;

        // 優先順位2: YYYYMMDD形式から抽出（完全修正版）
        const dateCode = this.extractFromDateFormat(filename);
        if (dateCode) return dateCode;

        // 優先順位3: コンテンツ内の日付から抽出
        const contentDateCode = this.extractFromDateFormat(content);
        if (contentDateCode) return contentDateCode;

        // デフォルト値
        return '2405';
    }

    /**
     * 令和形式の日付から期間コード抽出
     */
    private extractFromReiwaDate(text: string): string | null {
        // 令和○年○月○日 形式
        const reiwaPattern = /令和(\d+)年(\d+)月\d+日/;
        const reiwaMatch = text.match(reiwaPattern);
        
        if (reiwaMatch) {
            const reiwaYear = parseInt(reiwaMatch[1]);
            const month = parseInt(reiwaMatch[2]);
            const year = reiwaYear + 2018; // 令和元年 = 2019年
            return `${String(year).slice(-2)}${String(month).padStart(2, '0')}`;
        }

        return null;
    }

    /**
     * YYYYMMDD形式から期間コード抽出（修正版）
     * バグ修正: 8桁の日付を正確に認識
     */
    private extractFromDateFormat(text: string): string | null {
        // パターン1: YYYYMMDD（8桁連続）
        const eightDigitPattern = /(\d{8})/g;
        const matches = text.match(eightDigitPattern);
        
        if (matches) {
            for (const match of matches) {
                const year = match.substring(0, 4);
                const month = match.substring(4, 6);
                const day = match.substring(6, 8);
                
                // 有効な日付かチェック
                const yearNum = parseInt(year);
                const monthNum = parseInt(month);
                const dayNum = parseInt(day);
                
                if (yearNum >= 2020 && yearNum <= 2030 && 
                    monthNum >= 1 && monthNum <= 12 && 
                    dayNum >= 1 && dayNum <= 31) {
                    // 20240731 → 2407
                    return year.slice(-2) + month;
                }
            }
        }

        // パターン2: YYYY/MM/DD または YYYY-MM-DD
        const separatedPattern = /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/;
        const separatedMatch = text.match(separatedPattern);
        
        if (separatedMatch) {
            const year = separatedMatch[1];
            const month = separatedMatch[2].padStart(2, '0');
            return year.slice(-2) + month;
        }

        // パターン3: YYYY年MM月DD日
        const japanesePattern = /(\d{4})年(\d{1,2})月\d{1,2}日/;
        const japaneseMatch = text.match(japanesePattern);
        
        if (japaneseMatch) {
            const year = japaneseMatch[1];
            const month = japaneseMatch[2].padStart(2, '0');
            return year.slice(-2) + month;
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
}