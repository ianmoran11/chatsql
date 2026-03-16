import { getApiKey, getModel } from '../components/SettingsModal';
import type { QueryExecResult } from 'sql.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function interpretResults(
  question: string,
  result: QueryExecResult
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key not set. Please configure it in Settings.');
  }

  const { columns, values } = result;

  // Cap at 200 rows for the LLM
  const dataRows = values.slice(0, 200).map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });

  const systemPrompt = `You are a data analyst explaining query results as spoken commentary for a text-to-speech voice assistant. Your output will be read aloud directly, so it must sound completely natural when spoken.

Rules:
1. Write 2–4 short paragraphs of flowing, conversational prose. No bullet points, numbered lists, headings, or markdown of any kind.
2. Summarise the key findings, notable patterns, outliers, or trends visible in the data.
3. Spell out or phrase numbers so they read naturally when spoken (e.g. "one hundred and twenty-three" or "around 40 percent" rather than "123" or "40%"). Avoid bare symbols such as %, $, #, >, <, or &.
4. Never use abbreviations or acronyms that a voice assistant might mispronounce. Write them out in full.
5. Do not use column names, table names, or any raw technical identifiers. Describe what the data represents in everyday language.
6. Avoid technical jargon entirely. Do not mention SQL, databases, queries, or tables.
7. Do not invent data or infer beyond what is shown.
8. End with a natural closing sentence that summarises the overall takeaway.`;

  const userPrompt = `The user asked: "${question}"

The query returned ${values.length} row(s) with columns: ${columns.join(', ')}${values.length > 200 ? ` (first 200 of ${values.length} rows shown)` : ''}.

Data:
${JSON.stringify(dataRows)}

Please interpret these results in plain English.`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'ChatSQL',
    },
    body: JSON.stringify({
      model: getModel(),
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content as string | undefined;
  if (!content) {
    throw new Error('No response from API.');
  }

  return content.trim();
}
