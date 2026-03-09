import { getApiKey } from '../components/SettingsModal';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

function buildSystemPrompt(schema: string): string {
  return `You are an expert SQLite database analyst. Your task is to translate natural language questions into accurate, executable SQLite queries based strictly on the provided database schema.

### Data Governance & Execution Rules:
1. **Schema Strictness:** You must ONLY use the tables and columns explicitly defined in the metadata. Do not invent, guess, or assume the existence of any columns or tables.
2. **Read-Only:** You are a read-only analyst. You must NEVER generate queries that modify the database (e.g., no INSERT, UPDATE, DELETE, DROP, or ALTER).
3. **Capitalization & Syntax:** Be meticulous with capitalization. Table and column names must match the schema exactly. Ensure all SQLite queries end with a semicolon.
4. **Reasoning First:** You must always explain your analytical plan inside <analytical_plan> tags before writing the final SQL inside <sql_query> tags.

### Database Schema:
${schema}

### Expected Output Format:
<analytical_plan>
Step-by-step reasoning of how to solve the prompt using the schema.
</analytical_plan>
<sql_query>
SELECT ... FROM ... WHERE ...;
</sql_query>

### Examples of Expected Output:

<example>
<Question> For the year 2022, can you provide a summary report of principal offences that includes the total number of offenders and the corresponding court outcomes (both acquitted and guilty)? </Question>
<analytical_plan> We will generate two subqueries: one using the "offenders_by_offence" table to sum the "count_of_offenders" grouped by "principal_offence" for 2022, and another using the "courts_outcome_by_offence" table to sum "court_finalisation_acquitted" and "court_finalisation_guilty_outcome" for each principal offence for the same year. Finally, we join these subqueries on the "principal_offence" column. </analytical_plan>
<sql_query> SELECT O.principal_offence, O.total_offenders, C.total_acquitted, C.total_guilty FROM ( SELECT principal_offence, SUM(count_of_offenders) AS total_offenders FROM offenders_by_offence WHERE year = 2022 GROUP BY principal_offence ) AS O LEFT JOIN ( SELECT principal_offence, SUM(court_finalisation_acquitted) AS total_acquitted, SUM(court_finalisation_guilty_outcome) AS total_guilty FROM courts_outcome_by_offence WHERE year = 2022 GROUP BY principal_offence ) AS C ON O.principal_offence = C.principal_offence; </sql_query>
</example>`;
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamLLMResponse(
  prompt: string,
  schema: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    callbacks.onError('OpenRouter API key not set. Please configure it in Settings.');
    return;
  }

  const systemPrompt = buildSystemPrompt(schema);

  let response: Response;
  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'ChatSQL',
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `<Question> ${prompt} </Question>` },
        ],
      }),
    });
  } catch (err) {
    callbacks.onError(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  if (!response.ok) {
    const text = await response.text();
    callbacks.onError(`API error ${response.status}: ${text}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError('No response body from API.');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (typeof content === 'string') {
            callbacks.onChunk(content);
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  callbacks.onDone();
}
