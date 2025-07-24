// Jest セットアップファイル

// テスト環境の設定
process.env.NODE_ENV = 'test';

// モック設定
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// fs-extraのモック
jest.mock('fs-extra', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  ensureDir: jest.fn(),
  copy: jest.fn(),
  move: jest.fn(),
  pathExists: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  remove: jest.fn()
}));

// better-sqlite3のモック
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    exec: jest.fn(),
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    })),
    close: jest.fn()
  }));
});

// chokidarのモック
jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    close: jest.fn()
  }))
}));

// pdf-parseのモック
jest.mock('pdf-parse', () => 
  jest.fn(() => Promise.resolve({
    text: 'モックPDFテキスト',
    info: {
      Title: 'テストタイトル',
      Author: 'テスト作成者'
    }
  }))
);

// electron-storeのモック
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn()
  }));
});

// グローバルタイマー関数のモック
global.setTimeout = jest.fn((cb) => cb()) as any;
global.setInterval = jest.fn() as any;
global.clearTimeout = jest.fn() as any;
global.clearInterval = jest.fn() as any;