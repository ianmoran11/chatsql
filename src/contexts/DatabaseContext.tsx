import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Database, SqlJsStatic } from 'sql.js';
import initSqlJs from 'sql.js';

interface DatabaseContextType {
  db: Database | null;
  setDb: (db: Database | null) => void;
  sqlJs: SqlJsStatic | null;
  isLoading: boolean;
  error: string | null;
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

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
        if (cancelled) return;
        setSqlJs(SQL);

        const response = await fetch('/default.sqlite');
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
    <DatabaseContext.Provider value={{ db, setDb, sqlJs, isLoading, error }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider');
  return ctx;
}
