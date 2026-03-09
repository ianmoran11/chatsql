import { useState, useEffect } from 'react';

const API_KEY_STORAGE_KEY = 'openrouter_api_key';

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
}

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    setApiKey(getApiKey());
  }, []);

  const handleSave = () => {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-white mb-4">Settings</h2>

        <label className="block text-sm text-gray-400 mb-1">OpenRouter API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-or-..."
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 mb-4"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white px-4 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
