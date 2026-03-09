import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Database, SqlJsStatic } from 'sql.js';
import initSqlJs from 'sql.js';

export interface ColumnMeta {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
  dflt_value: string | null;
}

export interface TableMeta {
  name: string;
  columns: ColumnMeta[];
}

interface DatabaseContextType {
  db: Database | null;
  setDb: (db: Database | null) => void;
  sqlJs: SqlJsStatic | null;
  isLoading: boolean;
  error: string | null;
  schema: string;
  tablesMeta: TableMeta[];
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export async function loadDatabaseFromBuffer(sqlJs: SqlJsStatic, buffer: ArrayBuffer): Promise<Database> {
  return new sqlJs.Database(new Uint8Array(buffer));
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [sqlJs, setSqlJs] = useState<SqlJsStatic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<string>('');
  const [tablesMeta, setTablesMeta] = useState<TableMeta[]>([]);

  useEffect(() => {
    if (!db) {
      setSchema('');
      setTablesMeta([]);
      return;
    }
    try {
      const results = db.exec("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name");
      if (results.length > 0) {
        const ddl = (results[0].values as string[][]).map(row => row[0]).join('\n\n');
        setSchema(ddl);
      } else {
        setSchema('');
      }
    } catch {
      setSchema('');
    }

    try {
      const tableResults = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      if (tableResults.length === 0) {
        setTablesMeta([]);
        return;
      }
      const tableNames = (tableResults[0].values as string[][]).map(row => row[0]);
      const meta: TableMeta[] = tableNames.map(tableName => {
        try {
          const colResults = db.exec(`PRAGMA table_info("${tableName}")`);
          const columns: ColumnMeta[] = colResults.length > 0
            ? (colResults[0].values as (string | number | null)[][]).map(row => ({
                name: String(row[1]),
                type: String(row[2] ?? ''),
                notnull: Number(row[3]) === 1,
                dflt_value: row[4] != null ? String(row[4]) : null,
                pk: Number(row[5]) > 0,
              }))
            : [];
          return { name: tableName, columns };
        } catch {
          return { name: tableName, columns: [] };
        }
      });
      setTablesMeta(meta);
    } catch {
      setTablesMeta([]);
    }
  }, [db]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
        if (cancelled) return;
        setSqlJs(SQL);

        const response = await fetch('/northwind_small.sqlite');
        if (!response.ok) throw new Error('Failed to fetch default database');
        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const defaultDb = new SQL.Database(new Uint8Array(buffer));
        setDb(defaultDb);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to initialize database');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, setDb, sqlJs, isLoading, error, schema, tablesMeta }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider');
  return ctx;
}
