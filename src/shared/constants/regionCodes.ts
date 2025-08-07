/**
 * 地域・税目別番号マッピング定義
 * ファイル重複を防ぐため、地域・税目ごとに異なる番号を割り当てる
 */

// 受信通知の番号マッピング
export const RECEIPT_NOTICE_CODES: Record<string, string> = {
  '法人税': '0003',
  '東京都': '1003',
  '愛知県': '1013', 
  '福岡県': '1023',
  '蒲郡市': '2003',
  '福岡市': '2013',
  '消費税': '3003'
};

// 納付情報の番号マッピング
export const PAYMENT_INFO_CODES: Record<string, string> = {
  '法人税': '0004',
  '都道府県民税': '1004',
  '市民税': '2004',
  '法人市民税': '2004',
  '消費税': '3004'
};

// 都道府県コード
export const PREFECTURE_CODES: Record<string, string> = {
  '東京都': '1001',
  '愛知県': '1011',
  '福岡県': '1021'
};

// 市区町村コード
export const CITY_CODES: Record<string, string> = {
  '蒲郡市': '2001',
  '福岡市': '2011'
};

// 地域検出パターン
export const REGION_PATTERNS = [
  { pattern: /東京都/, region: '東京都' },
  { pattern: /愛知県/, region: '愛知県' },
  { pattern: /福岡県/, region: '福岡県' },
  { pattern: /蒲郡市/, region: '蒲郡市' },
  { pattern: /福岡市/, region: '福岡市' }
];

// 税目検出パターン
export const TAX_TYPE_PATTERNS = [
  { pattern: /法人税(?!.*都道府県|.*市)/, taxType: '法人税' },
  { pattern: /消費税/, taxType: '消費税' },
  { pattern: /都道府県[県民]税/, taxType: '都道府県民税' },
  { pattern: /法人市[町村]?民税|市民税/, taxType: '市民税' }
];