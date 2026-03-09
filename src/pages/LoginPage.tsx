import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SHARED_PASSWORD = import.meta.env.VITE_APP_PASSWORD as string;
const API_KEY_STORAGE_KEY = 'openrouter_api_key';

export default function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('chatsql_auth') === 'true') {
      navigate('/chat', { replace: true });
    }
    // Pre-fill API key if already saved
    setApiKey(localStorage.getItem(API_KEY_STORAGE_KEY) ?? '');
  }, [navigate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password === SHARED_PASSWORD) {
      localStorage.setItem('chatsql_auth', 'true');
      if (apiKey.trim()) {
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      }
      navigate('/chat', { replace: true });
    } else {
      setError('Incorrect password. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">ChatSQL</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">
          Conversational SQL query interface
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
              placeholder="••••••••"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-1">
              OpenRouter API Key{' '}
              <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
              placeholder="sk-or-..."
            />
            <p className="text-gray-500 text-xs mt-1">
              Can also be set later in Settings.
            </p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
