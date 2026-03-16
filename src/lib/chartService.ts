import { getApiKey, getModel } from '../components/SettingsModal';
import type { QueryExecResult } from 'sql.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function generateChartSpec(
  question: string,
  result: QueryExecResult
): Promise<object> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key not set. Please configure it in Settings.');
  }

  const { columns, values } = result;

  // Cap at 200 rows for the LLM to stay within token limits
  const dataRows = values.slice(0, 200).map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });

  const systemPrompt = `You are a data visualization expert. Generate the most appropriate Vega-Lite v5 specification to visualize the provided query results.

Rules:
1. Return ONLY a valid JSON Vega-Lite v5 specification — no explanation, no markdown code fences, no extra text.
2. Embed the data directly using "data": {"values": [...]}.
3. Choose the best mark type (bar, line, point, arc, etc.) based on the data shape and question.
4. Include a descriptive title.
5. Use axis labels that match the column names.
6. Use a color scheme suitable for a dark UI background.
7. The spec must be self-contained and renderable by vega-embed.`;

  const userPrompt = `Question: "${question}"

Columns: ${columns.join(', ')}
Total rows: ${values.length}${values.length > 200 ? ' (first 200 included)' : ''}

Data:
${JSON.stringify(dataRows)}

Return the Vega-Lite spec now.`;

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

  // Strip markdown code fences if present
  let specText = content.trim();
  const fenceMatch = specText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    specText = fenceMatch[1].trim();
  }

  return JSON.parse(specText);
}
