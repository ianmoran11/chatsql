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

  const systemPrompt = `You are a data analyst who communicates clearly to non-technical audiences. Your job is to interpret SQL query results in plain English.

Rules:
1. Write 2–4 concise paragraphs in plain, friendly language. No bullet points, no markdown headings.
2. Summarise the key findings, notable patterns, outliers, or trends visible in the data.
3. Reference specific numbers and column names where helpful.
4. Avoid technical jargon. Do not mention SQL, tables, or columns by raw name — instead describe what they represent.
5. Do not invent data or infer beyond what is shown.`;

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
