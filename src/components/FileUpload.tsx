import { useRef, useState } from 'react';
import { useDatabase, loadDatabaseFromBuffer } from '../contexts/DatabaseContext';

export default function FileUpload() {
  const { sqlJs, setDb } = useDatabase();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !sqlJs) return;

    setStatus(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        loadDatabaseFromBuffer(sqlJs, buffer).then((newDb) => {
          setDb(newDb);
          setStatus(`Loaded: ${file.name}`);
        }).catch(() => {
          setError('Failed to parse SQLite file.');
        });
      } catch {
        setError('Failed to read file.');
      }
    };
    reader.onerror = () => setError('File read error.');
    reader.readAsArrayBuffer(file);

    // Reset input so same file can be re-uploaded
    e.target.value = '';
  }

  return (
    <div className="p-4 border-t border-gray-700">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Database</p>
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded px-3 py-2 transition-colors"
      >
        Upload .sqlite file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".sqlite,.db,.sqlite3"
        className="hidden"
        onChange={handleFileChange}
      />
      {status && <p className="mt-2 text-xs text-green-400 truncate">{status}</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
