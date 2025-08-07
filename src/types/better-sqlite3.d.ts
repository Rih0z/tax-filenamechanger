declare module 'better-sqlite3' {
  interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): void;
    close(): void;
    pragma(pragma: string): unknown;
    transaction<T extends (...args: any[]) => any>(fn: T): T;
  }

  interface Statement {
    run(...params: any[]): RunResult;
    get(...params: any[]): any;
    all(...params: any[]): any[];
    iterate(...params: any[]): IterableIterator<any>;
    pluck(toggleState?: boolean): this;
    expand(toggleState?: boolean): this;
    bind(...params: any[]): this;
    columns(): ColumnDefinition[];
  }

  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface ColumnDefinition {
    name: string;
    column: string | null;
    table: string | null;
    database: string | null;
    type: string | null;
    nullable: boolean;
    primary: boolean;
    autoincrement: boolean;
  }

  interface Options {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: (message?: any, ...additionalArgs: any[]) => void;
  }

  function Database(filename: string, options?: Options): Database;

  export = Database;
}