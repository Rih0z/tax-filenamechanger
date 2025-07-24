# Claude.md - 税務書類自動リネーム・振り分けシステム AIコーディング原則

```yaml
ai_coding_principles:
  meta:
    version: "1.0"
    last_updated: "2025-07-22"
    description: "税務書類自動リネーム・振り分けシステム向けClaude AIコーディング実行原則"
    project_name: "Tax Document Auto-Rename System"
    
  core_principles:
    mandatory_declaration: "全てのコーディング作業開始時に必ずcore_principlesを完全に宣言すること"
    第1条: 
      rule: "常に思考開始前にClaude.mdの第一条から第四条のAIコーディング原則を全て宣言してから実施する"
      related_sections: ["execution_checklist", "mindset"]
    第2条: 
      rule: "常にプロの世界最高エンジニアとして対応する"
      related_sections: ["mindset", "quality_standards"]
    第3条: 
      rule: "モックや仮のコード、ハードコードを一切禁止する"
      related_sections: ["implementation", "architecture", "quality_standards"]
    第4条: 
      rule: "エンタープライズレベルの実装を実施し、修正は表面的ではなく、全体のアーキテクチャを意識して実施する"
      related_sections: ["architecture", "quality_standards", "deployment_requirements"]
    第5条: 
      rule: "問題に詰まったら、まずCLAUDE.mdやプロジェクトドキュメント内に解決策がないか確認する"
    第6条: 
      rule: "push前にアップロードするべきではない情報が含まれていないか確認する。特に税務情報などの機密データに注意"
    第7条: 
      rule: "不要な文書やスクリプトは増やさない。スクリプト作成時は常に既存のスクリプトで使用可能なものがないか以下のセクションを確認する、スクリプトを作成したらscriptsフォルダに、ドキュメントはドキュメントフォルダに格納する。一時スクリプトや文書はそれぞれのフォルダのtmpフォルダに保存し、使用後に必ず削除する。"
      related_sections: ["how_to_use_scripts"]
    第8条:
      rule: "実行ファイルを含むreleaseフォルダを作成する際は、これだけあれば実行できるという必要最小限のファイル群をまとめる"
      related_sections: ["deployment_requirements", "release_checklist"]

  project_specific_principles:
    data_protection:
      - "税務書類は極めて機密性の高い情報のため、データ保護を最優先とする"
      - "すべての処理はローカルで完結し、外部サーバーへのデータ送信は禁止"
      - "ファイル操作前に必ずバックアップ機能を実装"
    
    accuracy_requirements:
      - "税務書類の命名・分類は100%の正確性を目指す"
      - "曖昧な判定の場合は必ずユーザー確認を求める"
      - "処理ログを詳細に記録し、監査証跡を残す"
    
    user_experience:
      - "税理士業務の効率化を最優先とする"
      - "複雑な処理も直感的に操作できるUIを実装"
      - "エラー時も業務を中断させない graceful degradation"
    
    technology_choice_rationale:
      primary_requirement:
        - "【最重要】税理士が毎日便利に使い続けられる実用的なツールの実現"
        - "起動の速さ、動作の軽快さ、直感的な操作性を最優先"
        - "税理士の日常業務に溶け込む使いやすさ"
      
      electron_evaluation:
        pros:
          - "開発速度が速い（既存のWeb技術活用）"
          - "豊富なPDF処理ライブラリ"
          - "デバッグが容易"
          - "コミュニティが大きく問題解決が早い"
        cons:
          - "起動が遅い（3-5秒）→ 毎日使うツールとして致命的"
          - "メモリ使用量が多い（200MB+）→ 他の業務アプリと併用時に負担"
          - "アップデートサイズが大きい（100MB+）"
      
      tauri_evaluation:
        pros:
          - "起動が速い（1-2秒）→ 毎日使うツールとして理想的"
          - "メモリ使用量が少ない（20-50MB）→ 軽快な動作"
          - "セキュリティが堅牢"
        cons:
          - "Rust学習コストが高い → 開発期間への影響"
          - "PDF処理ライブラリが少ない → 実装の工夫が必要"
      
      final_decision:
        - "結論: 使い続けられることを最優先し、Electronを選択"
        - "理由1: 確実に機能を実装でき、早期にリリース可能"
        - "理由2: 起動時間は自動起動・常駐化で解決可能"
        - "理由3: 豊富なライブラリで税理士のニーズに素早く対応"
        - "将来的にパフォーマンスが課題になったらTauriへの移行も検討"
    
    future_integrations:
      money_forward:
        - "マネーフォワード クラウド会計API連携準備"
        - "OAuth2.0認証基盤の事前実装"
        - "API公開時に即座に対応可能な設計"
      
      tatsujin_series:
        - "申告の達人との連携インターフェース準備"
        - "CSV/XMLエクスポート機能の実装"
        - "達人シリーズのファイル形式対応"
      
      plugin_architecture:
        - "将来の連携拡張のためのプラグインシステム"
        - "外部システム連携用の標準インターフェース定義"
        - "APIアダプターパターンの実装"

  quality_standards:
    security:
      - "税務データの暗号化保存"
      - "アクセスログの完全記録"
      - "最小権限原則の徹底"
      - "SQLiteデータベースの暗号化"
    
    architecture:
      - "Electron + React + TypeScriptのベストプラクティス遵守"
      - "メインプロセスとレンダラープロセスの適切な分離"
      - "Redux/Context APIによる状態管理"
      - "DDD/Clean Architectureパターンの適用"
    
    implementation:
      - "TypeScriptの厳格な型定義"
      - "PDFパース処理の堅牢なエラーハンドリング"
      - "ファイルシステム操作の atomic operation"
      - "設定の環境変数/JSONファイル管理"

  testing_standards:
    approach:
      - "ファイル処理の単体テスト必須"
      - "リネームロジックの網羅的テスト"
      - "E2Eテストによる業務フロー検証"
      - "パフォーマンステスト（100ファイル同時処理）"
    
    validation:
      - "各税務書類パターンのテストケース作成"
      - "エッジケースの徹底的なテスト"
      - "ファイル権限エラーのテスト"

  documentation_management:
    structure:
      - "必要以上にドキュメントを増やさず、ログは.claude/logs/フォルダに格納する"
      - "必要なドキュメントは必ずdocumentフォルダに保存する"
      - "更新は同じファイルを編集する"
      - "APIドキュメントの自動生成（TypeDoc使用）"
    
    user_documentation:
      - "税理士向けの操作マニュアル作成"
      - "トラブルシューティングガイド"
      - "リネームルールのカスタマイズガイド"

  deployment_requirements:
    build_targets:
      - "Windows版優先（税理士事務所の主要OS）"
      - "Mac版も同時サポート"
      - "自動アップデート機能の実装"
    
    packaging:
      - "Electron Builderによるインストーラー作成"
      - "コード署名によるセキュリティ確保"
      - "アンインストール時の完全クリーンアップ"

  mindset:
    philosophy:
      - "税理士の業務効率化に貢献する"
      - "ミスゼロを目指す堅牢な実装"
      - "ユーザーフィードバックの積極的な反映"
      - "継続的な改善とメンテナンス"

  file_structure:
    project_root: "/"
    logs: ".claude/logs/"
    documents: "documents/"
    source: 
      main: "src/"
      electron_main: "src/main/"
      electron_renderer: "src/renderer/"
      shared: "src/shared/"
    tests: "tests/"
    config: "config/"
    scripts: "scripts/"
    build: "build/"
    dist: "dist/"
    sample_data: "sample/"
    database: "data/"

  technology_stack:
    framework:
      - "Electron: クロスプラットフォームデスクトップアプリ"
      - "React: UIフレームワーク"
      - "TypeScript: 型安全性の確保"
    
    backend:
      - "Node.js: バックエンド処理"
      - "SQLite: ローカルデータベース"
      - "pdf-parse: PDF解析"
      - "fs-extra: ファイル操作"
    
    frontend:
      - "Material-UI: UIコンポーネント"
      - "Redux/Context API: 状態管理"
      - "React Hook Form: フォーム管理"
    
    development:
      - "Jest: テストフレームワーク"
      - "ESLint: コード品質"
      - "Prettier: コードフォーマット"
      - "Electron Builder: パッケージング"

  execution_checklist:
    mandatory_declaration:
      - "[ ] **CORE_PRINCIPLES宣言**: 第1条〜第4条を完全に宣言"
      - "[ ] **関連セクション宣言**: 実行する作業に関連するセクションを宣言"
      - "[ ] **プロジェクト固有原則確認**: data_protection, accuracy_requirementsの確認"
    
    before_coding:
      - "[ ] AIコーディング原則を宣言"
      - "[ ] 税務書類の仕様確認"
      - "[ ] セキュリティ要件の確認"
      - "[ ] ファイル操作の影響範囲確認"
    
    during_coding:
      - "[ ] TypeScript型定義の徹底"
      - "[ ] エラーハンドリングの実装"
      - "[ ] バックアップ機能の実装"
      - "[ ] ログ記録の実装"
    
    after_coding:
      - "[ ] 単体テストの実装・実行"
      - "[ ] セキュリティチェック"
      - "[ ] パフォーマンステスト"
      - "[ ] ドキュメント更新"

  tax_document_patterns:
    naming_conventions:
      "0000番台": "法人税・地方法人税関連"
      "1000番台": "都道府県税関連"
      "2000番台": "市民税関連"
      "3000番台": "消費税関連"
      "4000番台": "事業所税関連"
      "5000番台": "決算書類関連"
      "6000番台": "固定資産関連"
      "7000番台": "税区分集計表関連"
    
    file_detection_rules:
      - "ファイル名パターンによる自動判定"
      - "PDF内容のテキスト解析"
      - "マルチバイト文字の適切な処理"
      - "決算期コードの自動生成"

  how_to_use_scripts:
    development:
      "npm run dev": "開発サーバー起動"
      "npm run build": "本番ビルド"
      "npm run test": "テスト実行"
      "npm run lint": "ESLint実行"
    
    electron:
      "npm run electron:dev": "Electron開発モード"
      "npm run electron:build": "Electronビルド"
      "npm run dist": "配布用パッケージ作成"
  
  release_checklist:
    minimum_required_files:
      - "実行に必要な最小限のファイル群をreleaseフォルダにまとめる"
      - "依存関係を整理し、開発用ツールを除外"
      - "スタンドアロンで動作する構成にする"
      - "テストファイルは含めない（本番実行に不要）"
    
    release_folder_structure:
      core_execution:
        - "src/main/services/PDFParser.ts - PDF解析ロジック"
        - "src/main/services/FileRenamer.ts - リネーム処理"
        - "src/main/services/FileWatcher.ts - ファイル監視"
        - "src/shared/types/index.ts - 型定義"
        - "src/shared/constants/config.ts - 設定"
      
      minimal_ui:
        - "簡易実行用スクリプト（standalone-runner.js）"
        - "基本的なHTML/JSインターフェース"
      
      sample_and_docs:
        - "sample/データ例/ - 動作確認用サンプル"
        - "README.md - 使用方法"
        - "QUICK_START.md - クイックスタートガイド"
      
      dependencies:
        - "package.json（本番用に最適化）"
        - "最小限のnode_modules（pdf-parse, chokidar, fs-extra）"
```

## プロジェクト構造

```
tax-filenamechanger/
├── .claude/                    # Claude AI関連ファイル
│   └── logs/                  # 処理ログ
├── src/                       # ソースコード
│   ├── main/                  # Electronメインプロセス
│   │   ├── index.ts          # メインエントリーポイント
│   │   ├── fileManager.ts    # ファイル操作管理
│   │   ├── database.ts       # SQLite管理
│   │   └── ipc/             # IPC通信
│   ├── renderer/             # Electronレンダラープロセス
│   │   ├── App.tsx          # Reactメインコンポーネント
│   │   ├── components/      # UIコンポーネント
│   │   ├── pages/          # ページコンポーネント
│   │   ├── hooks/          # カスタムフック
│   │   ├── store/          # Redux/状態管理
│   │   └── utils/          # ユーティリティ
│   └── shared/              # 共有コード
│       ├── types/          # TypeScript型定義
│       ├── constants/      # 定数定義
│       └── utils/          # 共有ユーティリティ
├── tests/                   # テストコード
│   ├── unit/               # 単体テスト
│   ├── integration/        # 統合テスト
│   └── e2e/               # E2Eテスト
├── config/                  # 設定ファイル
│   ├── webpack.config.js   # Webpack設定
│   ├── jest.config.js     # Jest設定
│   └── tsconfig.json      # TypeScript設定
├── scripts/                 # ビルド・デプロイスクリプト
│   └── tmp/               # 一時スクリプト
├── documents/              # プロジェクトドキュメント
│   ├── api/               # API仕様書
│   ├── user-guide/        # ユーザーガイド
│   └── tmp/               # 一時ドキュメント
├── build/                  # ビルド出力
├── dist/                   # 配布用パッケージ
├── data/                   # アプリケーションデータ
│   └── app.db             # SQLiteデータベース
├── sample/                 # サンプルデータ
│   └── データ例/
├── package.json           # npm設定
├── README.md             # プロジェクト仕様書
└── CLAUDE.md             # AIコーディング原則
```

## 使用方法

### 🚨 必須実行手順

1. **CORE_PRINCIPLES完全宣言**: 
   ```
   【AIコーディング原則宣言】
   第1条: 常に思考開始前にこれらのAIコーディング原則を宣言してから実施する
   第2条: 常にプロの世界最高エンジニアとして対応する  
   第3条: モックや仮のコード、ハードコードを一切禁止する
   第4条: エンタープライズレベルの実装を実施し、修正は表面的ではなく、全体のアーキテクチャを意識して実施する
   
   【プロジェクト固有原則宣言】
   - data_protection: 税務データの完全なローカル処理、暗号化、バックアップ
   - accuracy_requirements: 100%の正確性、曖昧な場合はユーザー確認
   ```

2. **関連セクション宣言**: 実行する作業に応じて関連セクションも必ず宣言
   - **ファイル処理実装時**: implementation + file_structure + tax_document_patterns
   - **UI実装時**: technology_stack.frontend + user_experience
   - **セキュリティ実装時**: quality_standards.security + data_protection

3. **チェックリスト活用**: execution_checklistを必ず確認

## ⚠️ 重要な注意事項

### 🔴 絶対遵守ルール
- **税務データの機密性**: 外部送信禁止、ローカル完結必須
- **正確性の確保**: 税務書類の誤分類・誤命名は業務に重大な影響
- **バックアップ必須**: ファイル操作前の元データ保護

### 📋 宣言パターン例（税務システム向け）
```yaml
# PDF解析機能実装時
core_principles: [第2条, 第3条, 第4条]
project_specific: [data_protection, accuracy_requirements]
related_sections: [implementation, tax_document_patterns, testing_standards]

# ファイル振り分け機能実装時
core_principles: [第3条, 第4条]
project_specific: [data_protection, user_experience]
related_sections: [file_structure, quality_standards.security, architecture]
```

### 🚫 禁止事項
- 税務データの外部送信
- ハードコードされたファイルパス
- テスト未実施のファイル操作機能
- 暗号化なしのデータ保存

### ✅ 品質保証
- 税理士業務の効率化を最優先
- エラー時も業務継続可能な設計
- 完全な操作履歴とログ記録