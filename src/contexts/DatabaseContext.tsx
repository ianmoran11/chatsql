import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Database, SqlJsStatic } from 'sql.js';

interface DatabaseContextType {
  db: Database | null;
  setDb: (db: Database | null) => void;
  sqlJs: SqlJsStatic | null;
  setSqlJs: (sqlJs: SqlJsStatic | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [sqlJs, setSqlJs] = useState<SqlJsStatic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <DatabaseContext.Provider value={{ db, setDb, sqlJs, setSqlJs, isLoading, setIsLoading, error, setError }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider');
  return ctx;
}
