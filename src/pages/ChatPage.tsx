import FileUpload from '../components/FileUpload';
import { useDatabase } from '../contexts/DatabaseContext';

export default function ChatPage() {
  const { isLoading, error } = useDatabase();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 flex flex-col border-r border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold text-indigo-400">ChatSQL</h1>
        </div>

        <div className="flex-1 p-4">
          {isLoading && <p className="text-sm text-gray-400">Loading database...</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!isLoading && !error && (
            <p className="text-sm text-green-400">Database ready</p>
          )}
        </div>

        <FileUpload />
      </aside>

      {/* Main area */}
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Chat coming soon...</p>
      </main>
    </div>
  );
}
