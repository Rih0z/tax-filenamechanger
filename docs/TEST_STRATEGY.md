# テスト戦略書

## 1. テスト方針

### 1.1 基本方針

- **テストファースト開発**: 機能実装前にテストを作成
- **カバレッジ目標**: 80%以上（重要機能は100%）
- **自動化優先**: CI/CDパイプラインでの自動実行
- **実データ保護**: テストでは模擬データを使用

### 1.2 テストピラミッド

```
         ╱ E2E Tests (10%) ╲
        ╱                   ╲
       ╱ Integration Tests   ╲
      ╱      (30%)           ╲
     ╱                        ╲
    ╱   Unit Tests (60%)      ╲
   ╱___________________________╲
```

## 2. テストレベル別戦略

### 2.1 単体テスト（Unit Tests）

**対象**:
- ビジネスロジック
- ユーティリティ関数
- Reactコンポーネント
- Redux reducers/actions

**ツール**:
- Jest
- React Testing Library
- TypeScript

**実装例**:

```typescript
// tests/unit/services/PDFParser.test.ts
describe('PDFParser', () => {
  let parser: PDFParser;
  
  beforeEach(() => {
    parser = new PDFParser();
  });
  
  describe('parseFileName', () => {
    it('法人税申告書のファイル名を正しく解析する', async () => {
      const fileName = '法人税及び地方法人税申告書_20240731クライアントA株式会社_20250720130102.pdf';
      const result = parser.parseFileName(fileName);
      
      expect(result).toEqual({
        documentType: DocumentType.CORPORATE_TAX,
        companyName: 'クライアントA株式会社',
        fiscalYear: '2407',
        submissionDate: '2025-07-20'
      });
    });
    
    it('不正なファイル名の場合はnullを返す', () => {
      const fileName = 'invalid.pdf';
      const result = parser.parseFileName(fileName);
      
      expect(result).toBeNull();
    });
  });
});
```

```typescript
// tests/unit/components/FileList.test.tsx
describe('FileList', () => {
  it('ファイル一覧を正しく表示する', () => {
    const files = [
      { id: '1', name: 'test1.pdf', documentType: '法人税申告書' },
      { id: '2', name: 'test2.pdf', documentType: '消費税申告書' }
    ];
    
    render(<FileList files={files} />);
    
    expect(screen.getByText('test1.pdf')).toBeInTheDocument();
    expect(screen.getByText('test2.pdf')).toBeInTheDocument();
    expect(screen.getByText('法人税申告書')).toBeInTheDocument();
  });
  
  it('ファイル選択時にコールバックが呼ばれる', () => {
    const onSelect = jest.fn();
    const files = [{ id: '1', name: 'test.pdf' }];
    
    render(<FileList files={files} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByRole('checkbox'));
    
    expect(onSelect).toHaveBeenCalledWith(['1']);
  });
});
```

### 2.2 統合テスト（Integration Tests）

**対象**:
- IPC通信
- データベース操作
- ファイルシステム操作
- 外部ライブラリ統合

**ツール**:
- Jest
- SuperTest（APIテスト）
- SQLite（インメモリDB）

**実装例**:

```typescript
// tests/integration/ipc/fileHandler.test.ts
describe('FileHandler IPC', () => {
  let app: Application;
  
  beforeAll(async () => {
    app = await createTestApp();
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  it('ファイルスキャンが正しく動作する', async () => {
    const testDir = path.join(__dirname, 'fixtures');
    
    const response = await app.ipc.invoke('file:scan', {
      folders: [testDir],
      fileTypes: ['.pdf']
    });
    
    expect(response.success).toBe(true);
    expect(response.data.files).toHaveLength(3);
    expect(response.data.files[0]).toMatchObject({
      name: expect.any(String),
      path: expect.stringContaining(testDir),
      extension: '.pdf'
    });
  });
});
```

```typescript
// tests/integration/database/ClientRepository.test.ts
describe('ClientRepository', () => {
  let db: Database;
  let repository: ClientRepository;
  
  beforeEach(async () => {
    db = new Database(':memory:');
    await db.migrate();
    repository = new ClientRepository(db);
  });
  
  afterEach(async () => {
    await db.close();
  });
  
  it('クライアントの作成と取得が正しく動作する', async () => {
    const client = await repository.create({
      name: 'テスト株式会社',
      fiscalYearEnd: '2503',
      outputFolder: '/test/output'
    });
    
    const found = await repository.findById(client.id);
    
    expect(found).toEqual(client);
  });
});
```

### 2.3 E2Eテスト（End-to-End Tests）

**対象**:
- ユーザーワークフロー全体
- クリティカルパス
- クロスプラットフォーム動作

**ツール**:
- Playwright
- Spectron（Electron専用）

**実装例**:

```typescript
// tests/e2e/workflows/fileProcessing.test.ts
describe('ファイル処理ワークフロー', () => {
  let app: ElectronApplication;
  
  beforeAll(async () => {
    app = await electron.launch({
      args: ['.'],
      env: { NODE_ENV: 'test' }
    });
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  test('PDFファイルのドラッグ&ドロップから処理完了まで', async () => {
    const page = await app.firstWindow();
    
    // ファイルをドロップゾーンにドラッグ
    await page.dragAndDrop(
      'tests/fixtures/法人税申告書.pdf',
      '#drop-zone'
    );
    
    // ファイルが一覧に表示される
    await expect(page.locator('.file-item')).toHaveCount(1);
    await expect(page.locator('.file-name')).toContainText('法人税申告書');
    
    // リネーム後の名前が表示される
    await expect(page.locator('.new-name')).toContainText('0001_法人税及び地方法人税申告書');
    
    // 処理実行
    await page.click('#process-button');
    
    // 成功メッセージが表示される
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText('1件のファイルを処理しました');
  });
});
```

## 3. テストデータ管理

### 3.1 フィクスチャ構成

```
tests/
├── fixtures/
│   ├── pdf/
│   │   ├── 法人税申告書_valid.pdf
│   │   ├── 消費税申告書_valid.pdf
│   │   ├── corrupted.pdf
│   │   └── encrypted.pdf
│   ├── csv/
│   │   └── 仕訳データ.csv
│   └── database/
│       └── seed.sql
```

### 3.2 テストデータ生成

```typescript
// tests/helpers/testDataGenerator.ts
export class TestDataGenerator {
  static createMockPDF(options: {
    documentType: DocumentType;
    companyName: string;
    fiscalYear: string;
  }): Buffer {
    // PDFLibを使用してテスト用PDFを生成
  }
  
  static createMockClient(overrides?: Partial<Client>): Client {
    return {
      id: faker.datatype.uuid(),
      name: faker.company.name() + '株式会社',
      fiscalYearEnd: '2503',
      outputFolder: '/test/output',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }
}
```

## 4. モック戦略

### 4.1 ファイルシステムモック

```typescript
// tests/mocks/fileSystem.ts
export const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  rename: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn()
};

jest.mock('fs-extra', () => mockFs);
```

### 4.2 IPC通信モック

```typescript
// tests/mocks/electron.ts
export const mockIpcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

export const mockIpcMain = {
  handle: jest.fn(),
  emit: jest.fn()
};
```

## 5. パフォーマンステスト

### 5.1 ベンチマーク

```typescript
// tests/performance/fileBatch.test.ts
describe('バッチ処理パフォーマンス', () => {
  it('100ファイルを5秒以内に処理できる', async () => {
    const files = Array.from({ length: 100 }, (_, i) => 
      createMockFile(`test${i}.pdf`)
    );
    
    const startTime = performance.now();
    await processor.batchProcess(files);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(5000);
  });
});
```

### 5.2 メモリ使用量テスト

```typescript
// tests/performance/memory.test.ts
describe('メモリ使用量', () => {
  it('大きなPDFファイル処理時のメモリ使用量が適切', async () => {
    const largePDF = createLargePDF(50); // 50MB
    
    const memBefore = process.memoryUsage().heapUsed;
    await parser.parse(largePDF);
    const memAfter = process.memoryUsage().heapUsed;
    
    const increase = (memAfter - memBefore) / 1024 / 1024; // MB
    expect(increase).toBeLessThan(100); // 100MB未満の増加
  });
});
```

## 6. セキュリティテスト

### 6.1 入力検証テスト

```typescript
describe('セキュリティ', () => {
  it('パストラバーサル攻撃を防ぐ', async () => {
    const maliciousPath = '../../../etc/passwd';
    
    await expect(
      fileService.readFile(maliciousPath)
    ).rejects.toThrow('Invalid file path');
  });
  
  it('SQLインジェクションを防ぐ', async () => {
    const maliciousName = "'; DROP TABLE clients; --";
    
    const result = await clientRepo.findByName(maliciousName);
    expect(result).toBeNull();
    
    // テーブルが削除されていないことを確認
    const clients = await clientRepo.findAll();
    expect(clients).toBeDefined();
  });
});
```

## 7. CI/CD統合

### 7.1 GitHub Actions設定

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
        node: [18, 20]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
        if: matrix.os == 'windows-latest' # E2Eは主要OSのみ
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## 8. テスト実行コマンド

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:debug": "node --inspect-brk ./node_modules/.bin/jest --runInBand"
  }
}
```

## 9. テストレポート

### 9.1 カバレッジレポート

```
---------------------|---------|----------|---------|---------|
File                 | % Stmts | % Branch | % Funcs | % Lines |
---------------------|---------|----------|---------|---------|
All files            |   85.32 |    78.45 |   88.12 |   84.98 |
 services/           |   92.15 |    85.23 |   94.44 |   91.89 |
  PDFParser.ts       |   95.12 |    88.89 |  100.00 |   94.87 |
  FileRenamer.ts     |   89.47 |    82.35 |   90.00 |   89.19 |
 components/         |   82.45 |    75.00 |   85.71 |   82.14 |
  FileList.tsx       |   88.24 |    80.00 |   90.00 |   87.50 |
  Settings.tsx       |   78.57 |    71.43 |   83.33 |   78.26 |
---------------------|---------|----------|---------|---------|
```

### 9.2 テスト結果サマリー

```
Test Suites: 45 passed, 45 total
Tests:       312 passed, 312 total
Snapshots:   0 total
Time:        23.456s
```

## 10. トラブルシューティング

### 10.1 よくある問題

**問題**: Electronのテストが失敗する
```bash
# 解決策: xvfbを使用（Linux）
xvfb-run -a npm run test:e2e
```

**問題**: Windows固有のパステスト失敗
```typescript
// 解決策: パスの正規化
const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
```

**問題**: タイミング依存のテスト失敗
```typescript
// 解決策: 適切な待機処理
await waitFor(() => {
  expect(screen.getByText('完了')).toBeInTheDocument();
}, { timeout: 5000 });
```