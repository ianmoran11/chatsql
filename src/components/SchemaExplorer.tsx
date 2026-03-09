import { useState } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import type { TableMeta, ColumnMeta } from '../contexts/DatabaseContext';

function ColumnRow({ col }: { col: ColumnMeta }) {
  const badges: string[] = [];
  if (col.pk) badges.push('PK');
  if (col.notnull) badges.push('NOT NULL');

  return (
    <div className="flex items-start gap-2 py-1 px-3 text-xs text-gray-300 hover:bg-gray-700/50">
      <span className="font-mono text-gray-100 shrink-0">{col.name}</span>
      <span className="text-gray-500 shrink-0">{col.type || 'TEXT'}</span>
      {badges.map(b => (
        <span key={b} className="shrink-0 px-1 rounded text-[10px] font-semibold bg-indigo-900/60 text-indigo-300">
          {b}
        </span>
      ))}
      {col.dflt_value != null && (
        <span className="text-gray-500 font-mono truncate" title={`default: ${col.dflt_value}`}>
          ={col.dflt_value}
        </span>
      )}
    </div>
  );
}

function TableRow({ table }: { table: TableMeta }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-700/50 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-700/50 transition-colors"
      >
        <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        <span className="text-sm text-gray-100 font-medium truncate flex-1">{table.name}</span>
        <span className="text-xs text-gray-500 shrink-0">{table.columns.length} col{table.columns.length !== 1 ? 's' : ''}</span>
      </button>
      {open && (
        <div className="pb-1 bg-gray-900/30">
          {table.columns.length === 0 ? (
            <p className="px-3 py-1 text-xs text-gray-500 italic">No columns found</p>
          ) : (
            table.columns.map(col => <ColumnRow key={col.name} col={col} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function SchemaExplorer() {
  const { tablesMeta, isLoading } = useDatabase();

  if (isLoading) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 py-2 border-b border-gray-700">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Schema — {tablesMeta.length} table{tablesMeta.length !== 1 ? 's' : ''}
        </p>
      </div>
      {tablesMeta.length === 0 ? (
        <p className="px-3 py-3 text-xs text-gray-500 italic">No tables found</p>
      ) : (
        tablesMeta.map(table => <TableRow key={table.name} table={table} />)
      )}
    </div>
  );
}
