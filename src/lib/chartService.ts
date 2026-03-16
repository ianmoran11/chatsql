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
3. The encoding fields must reference the exact column names provided exactly as given.
4. The spec must be valid Vega-Lite v5 renderable by vega-embed.
5. Do NOT include a "config" block and do NOT set any color, background, fill, stroke, font, or text-color properties anywhere in the spec. The application applies its own visual theme — any colors you add will break the theme and produce unreadable text on dark backgrounds.
6. Do NOT set "background" at the top level or inside any nested object.

CHART SELECTION BEST PRACTICES:
- Bar chart: comparing discrete categories (most common). Use horizontal bars ("mark": "bar" with x=quantitative, y=nominal) when category labels are long.
- Sorted bars: ALWAYS sort bar charts by value. For vertical bars add "sort": "-y" on the x encoding. For horizontal bars add "sort": "-x" on the y encoding.
- Line chart: time series or sequential ordered data only.
- Scatter/point: relationship between two numeric variables.
- Arc/pie: part-to-whole composition with 5 or fewer categories only.
- Avoid pie charts for more than 5 slices — use a sorted bar chart instead.

AESTHETICS BEST PRACTICES:
- Include a concise, descriptive title.
- Use human-readable axis titles (not raw column names) — set "title" on each encoding channel.
- For categorical axes with labels longer than 10 characters, rotate labels: add "axis": {"labelAngle": -30} on that encoding.
- Use "aggregate" in encodings (e.g. "aggregate": "sum") when the data has multiple rows per category.
- Keep the spec minimal — omit tooltips, legends, or extra layers unless they add clear value.
- For bar charts, set "bandPaddingInner": 0.2 at the mark level for comfortable spacing.`;


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

  // Strip any LLM-injected styling that would conflict with the app theme
  delete spec.config;
  delete spec.background;

  return spec;
}
