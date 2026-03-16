const DEEPINFRA_TTS_URL = 'https://api.deepinfra.com/v1/inference/hexgrad/Kokoro-82M';
export const DEEPINFRA_KEY_STORAGE = 'deepinfra_api_key';

export function getDeepInfraKey(): string {
  return localStorage.getItem(DEEPINFRA_KEY_STORAGE) ?? '';
}

/**
 * Calls the DeepInfra Kokoro-82M TTS model and returns a blob URL for the audio.
 */
export async function generateTTS(text: string): Promise<string> {
  const apiKey = getDeepInfraKey();
  if (!apiKey) {
    throw new Error('DeepInfra API key not set. Please configure it in Settings.');
  }

  const response = await fetch(DEEPINFRA_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, preset: 'af_heart' }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepInfra TTS error ${response.status}: ${errText}`);
  }

  const json = await response.json() as Record<string, unknown>;

  // DeepInfra returns audio as a base64 data URL in json.audio
  const audioData = json.audio as string | undefined;
  if (!audioData) {
    throw new Error('No audio returned from TTS API.');
  }

  // If it's already a data URL, return as-is; otherwise wrap it
  if (audioData.startsWith('data:')) {
    return audioData;
  }

  // Assume raw base64 WAV
  return `data:audio/wav;base64,${audioData}`;
}
