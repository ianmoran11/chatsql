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

  // Build the actual data rows from the real SQL result (all rows, not capped)
  const dataRows = values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });

  // Provide a small sample so the LLM understands data types/shape, without sending all rows
  const sampleRows = dataRows.slice(0, 5);

  const systemPrompt = `You are a data visualization expert. Generate a Vega-Lite v5 specification to visualize the provided query results.

CRITICAL RULES:
1. Return ONLY a valid JSON Vega-Lite v5 specification — no explanation, no markdown code fences, no extra text.
2. Do NOT include any data values in the spec. Set "data" to exactly: {"name": "table"}
   The actual data will be injected programmatically after you return the spec.
3. Choose the best mark type (bar, line, point, arc, etc.) based on the data shape and question.
4. Include a descriptive title.
5. Use axis labels that match the column names exactly as provided.
6. The encoding fields must reference the exact column names provided.
7. The spec must be valid Vega-Lite v5 renderable by vega-embed.`;

  const userPrompt = `Question: "${question}"

Column names (use these exactly in your encoding): ${columns.join(', ')}
Total rows: ${values.length}
Sample rows (for type inference only — do NOT include data in the spec):
${JSON.stringify(sampleRows, null, 2)}

Return the Vega-Lite spec now. Remember: set "data": {"name": "table"} and do not embed any data values.`;

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

  const spec = JSON.parse(specText) as Record<string, unknown>;

  // Programmatically inject the real data from the SQL result, ignoring whatever the LLM may have set
  spec.data = { values: dataRows };

  return spec;
}
