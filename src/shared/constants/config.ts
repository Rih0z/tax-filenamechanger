export const APP_CONFIG = {
  WINDOW: {
    WIDTH: 1200,
    HEIGHT: 800,
    MIN_WIDTH: 800,
    MIN_HEIGHT: 600
  },
  
  FILE_TYPES: {
    SUPPORTED: ['.pdf', '.csv'],
    PDF: '.pdf',
    CSV: '.csv'
  },
  
  RENAME_PATTERNS: {
    // 法人税関連
    CORPORATE_TAX: {
      prefix: '0000',
      patterns: [
        /法人税.*申告書/,
        /地方法人税.*申告書/
      ]
    },
    CORPORATE_TAX_RECEIPT: {
      prefix: '0003',
      patterns: [/法人税.*受信通知/]
    },
    CORPORATE_TAX_PAYMENT: {
      prefix: '0004',
      patterns: [/法人税.*納付情報/]
    },
    
    // 都道府県税関連
    PREFECTURAL_TAX: {
      prefixes: {
        '東京都': '1011',
        '愛知県': '1021',
        '福岡県': '1031'
      },
      patterns: [/都道府県民税.*事業税/]
    },
    
    // 市民税関連
    MUNICIPAL_TAX: {
      prefixes: {
        '蒲郡市': '2001',
        '福岡市': '2011'
      },
      patterns: [/法人市.*民税/]
    },
    
    // 消費税関連
    CONSUMPTION_TAX: {
      prefix: '3001',
      patterns: [/消費税.*申告書/]
    },
    CONSUMPTION_TAX_RECEIPT: {
      prefix: '3003',
      patterns: [/消費税.*受信通知/]
    },
    CONSUMPTION_TAX_PAYMENT: {
      prefix: '3004',
      patterns: [/消費税.*納付情報/]
    },
    
    // 決算書類関連
    FINANCIAL_STATEMENT: {
      prefix: '5001',
      patterns: [/決算書/, /財務諸表/]
    },
    GENERAL_LEDGER: {
      prefix: '5002',
      patterns: [/総勘定元帳/]
    },
    SUB_LEDGER: {
      prefix: '5003',
      patterns: [/補助元帳/]
    },
    TRIAL_BALANCE: {
      prefix: '5004',
      patterns: [/残高試算表/, /貸借対照表.*損益計算書/]
    },
    JOURNAL: {
      prefix: '5005',
      patterns: [/仕訳帳/]
    },
    
    // 固定資産関連
    FIXED_ASSET: {
      prefix: '6001',
      patterns: [/固定資産台帳/]
    },
    BATCH_DEPRECIATION: {
      prefix: '6002',
      patterns: [/一括償却資産/]
    },
    SMALL_ASSET: {
      prefix: '6003',
      patterns: [/少額.*資産/, /少額減価償却/]
    },
    
    // 税区分関連
    TAX_CLASSIFICATION: {
      prefix: '7001',
      patterns: [/勘定科目別税区分/]
    },
    TAX_SUMMARY: {
      prefix: '7002',
      patterns: [/税区分集計表/]
    }
  },
  
  DEFAULT_FOLDERS: {
    DOWNLOADS: process.platform === 'win32' 
      ? `${process.env.USERPROFILE}\\Downloads`
      : `${process.env.HOME}/Downloads`
  },
  
  DATABASE: {
    PATH: process.env.NODE_ENV === 'development'
      ? './data/dev.db'
      : `${process.env.APPDATA || process.env.HOME}/.tax-filenamechanger/app.db`
  },
  
  LOGGING: {
    LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    MAX_FILES: 7,
    MAX_SIZE: '10m'
  }
};