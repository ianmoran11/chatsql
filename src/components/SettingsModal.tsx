import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { THEMES, THEME_LABELS, type Theme } from '../lib/themes';
import { DEEPINFRA_KEY_STORAGE, getDeepInfraKey } from '../lib/ttsService';

const API_KEY_STORAGE_KEY = 'openrouter_api_key';
const MODEL_STORAGE_KEY = 'openrouter_model';

export const AVAILABLE_MODELS = [
  'openai/gpt-oss-120b',
  'google/gemini-3-flash-preview',
  'google/gemini-3.1-pro-preview',
] as const;

export const DEFAULT_MODEL = AVAILABLE_MODELS[0];

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
}

export function getModel(): string {
  return localStorage.getItem(MODEL_STORAGE_KEY) ?? DEFAULT_MODEL;
}

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [deepInfraKey, setDeepInfraKey] = useState('');
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const { theme: currentTheme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    setApiKey(getApiKey());
    setDeepInfraKey(getDeepInfraKey());
    setModel(getModel());
  }, []);

  const handleSave = () => {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
    localStorage.setItem(DEEPINFRA_KEY_STORAGE, deepInfraKey.trim());
    localStorage.setItem(MODEL_STORAGE_KEY, model);
    setTheme(selectedTheme);
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

        <label className="block text-sm text-gray-400 mb-1">
          DeepInfra API Key{' '}
          <span className="text-gray-500 font-normal">(optional – required for TTS)</span>
        </label>
        <input
          type="password"
          value={deepInfraKey}
          onChange={(e) => setDeepInfraKey(e.target.value)}
          placeholder="Your DeepInfra API key"
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 mb-4"
        />

        <label className="block text-sm text-gray-400 mb-1">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mb-4"
        >
          {AVAILABLE_MODELS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <label className="block text-sm text-gray-400 mb-1">Theme</label>
        <select
          value={selectedTheme}
          onChange={(e) => setSelectedTheme(e.target.value as Theme)}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mb-6"
        >
          {THEMES.map((t) => (
            <option key={t} value={t}>{THEME_LABELS[t]}</option>
          ))}
        </select>

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
