/**
 * 会計書類処理サービス（決算書類・帳票類）
 * 実サンプル処理率改善のため追加実装
 */

export class AccountingDocumentProcessor {
    private documentPatterns = {
        // 5000番台 - 決算書類
        '決算書': { code: '5001', type: '決算書' },
        '総勘定元帳': { code: '5002', type: '総勘定元帳' },
        '補助元帳': { code: '5003', type: '補助元帳' },
        '残高試算表': { code: '5004', type: '残高試算表' },
        '貸借対照表': { code: '5004', type: '残高試算表' },
        '損益計算書': { code: '5004', type: '残高試算表' },
        '仕訳帳': { code: '5005', type: '仕訳帳' },
        '仕訳データ': { code: '5006', type: '仕訳データ' },
        
        // 6000番台 - 固定資産
        '固定資産台帳': { code: '6001', type: '固定資産台帳' },
        '一括償却': { code: '6002', type: '一括償却資産明細表' },
        '少額': { code: '6003', type: '少額減価償却資産明細表' },
        '減価償却': { code: '6004', type: '減価償却資産明細表' },
        
        // 7000番台 - 税区分集計表
        '税区分集計': { code: '7001', type: '勘定科目別税区分集計表' },
        '税区分': { code: '7002', type: '税区分集計表' },
        
        // 0000番台 - その他税務書類
        '納税一覧': { code: '0000', type: '納付税額一覧表' },
        '納付税額': { code: '0000', type: '納付税額一覧表' },
    };

    /**
     * ファイル名から会計書類タイプを判定
     * @param filename ファイル名
     * @returns 書類情報（番号、タイプ、フォルダ）
     */
    processAccountingDocument(filename: string): {
        code: string;
        type: string;
        folder: string;
        matched: boolean;
    } {
        // ファイル名を正規化（小文字、スペース除去）
        const normalizedName = filename.toLowerCase().replace(/[\s_\-]/g, '');

        // パターンマッチング
        for (const [pattern, info] of Object.entries(this.documentPatterns)) {
            const normalizedPattern = pattern.replace(/[\s_\-]/g, '');
            if (normalizedName.includes(normalizedPattern)) {
                return {
                    code: info.code,
                    type: info.type,
                    folder: this.getFolderName(info.code),
                    matched: true
                };
            }
        }

        // 特殊パターンの処理
        // CSV形式のチェック
        if (filename.endsWith('.csv')) {
            if (normalizedName.includes('仕訳')) {
                return {
                    code: '5006',
                    type: '仕訳データ',
                    folder: '5000番台_決算書類',
                    matched: true
                };
            }
        }

        // マッチしない場合
        return {
            code: '9999',
            type: '不明',
            folder: '9999番台_その他',
            matched: false
        };
    }

    /**
     * コードからフォルダ名を生成
     */
    private getFolderName(code: string): string {
        const prefix = code.charAt(0);
        const folderMap: { [key: string]: string } = {
            '0': '0000番台_法人税',
            '5': '5000番台_決算書類',
            '6': '6000番台_固定資産',
            '7': '7000番台_税区分集計表',
            '9': '9999番台_その他'
        };
        return folderMap[prefix] || '9999番台_その他';
    }

    /**
     * 複合ファイル名の処理（複数の要素を含む場合）
     * 例: "残高試算表_貸借対照表_損益計算書_20250720_1538.pdf"
     */
    processComplexFilename(filename: string): {
        primaryType: string;
        code: string;
        folder: string;
    } {
        // アンダースコアで分割して最初の重要な要素を特定
        const parts = filename.split('_');
        
        // 優先順位の高い書類タイプ
        const priorityTypes = [
            '残高試算表',
            '総勘定元帳',
            '仕訳帳',
            '固定資産台帳',
            '税区分集計表'
        ];

        for (const priority of priorityTypes) {
            for (const part of parts) {
                if (part.includes(priority)) {
                    const result = this.processAccountingDocument(priority);
                    if (result.matched) {
                        return {
                            primaryType: result.type,
                            code: result.code,
                            folder: result.folder
                        };
                    }
                }
            }
        }

        // デフォルト処理
        const result = this.processAccountingDocument(filename);
        return {
            primaryType: result.type,
            code: result.code,
            folder: result.folder
        };
    }
}