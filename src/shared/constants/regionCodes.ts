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

// 東京23区
export const TOKYO_23_WARDS = [
  '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区',
  '墨田区', '江東区', '品川区', '目黒区', '大田区', '世田谷区',
  '渋谷区', '中野区', '杉並区', '豊島区', '北区', '荒川区',
  '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区'
];

// 大阪市の区
export const OSAKA_WARDS = [
  '北区', '都島区', '福島区', '此花区', '中央区', '西区',
  '港区', '大正区', '天王寺区', '浪速区', '西淀川区', '淀川区',
  '東淀川区', '東成区', '生野区', '旭区', '城東区', '鶴見区',
  '阿倍野区', '住之江区', '住吉区', '東住吉区', '平野区', '西成区'
];

// 税務番号パターン
export const TAX_NUMBER_PATTERNS: Record<string, string> = {
  '法人税関連': '0',
  '都道府県税関連': '1',
  '市民税関連': '2',
  '消費税関連': '3',
  '事業所税関連': '4',
  '決算書類': '5',
  '固定資産関連': '6',
  '税区分集計表': '7',
  'その他': '9'
};

// 地域コード
export const REGION_CODES: Record<string, string> = {
  ...PREFECTURE_CODES,
  ...CITY_CODES
};