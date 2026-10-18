// Optional Claude-powered answers for ARIA, via the aria-chat Supabase edge
// function. Off by default: nothing here runs until the site is built with
// VITE_ARIA_LLM=on (see supabase/functions/aria-chat/README.md). Any failure
// falls back to the on-device engine.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const ARIA_LLM_ENABLED = import.meta.env.VITE_ARIA_LLM === 'on' && Boolean(SUPABASE_URL && SUPABASE_KEY);

const FIRST_BYTE_TIMEOUT_MS = 10000;
const TOTAL_TIMEOUT_MS = 45000;

export interface RemoteTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Streams answer text from the edge function. Throws on any error so the caller can fall back. */
export async function* streamAriaAnswer(messages: RemoteTurn[], signal: AbortSignal): AsyncGenerator<string> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort);
  let firstByteTimer = window.setTimeout(abort, FIRST_BYTE_TIMEOUT_MS);
  const totalTimer = window.setTimeout(abort, TOTAL_TIMEOUT_MS);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/aria-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY ?? '',
        Authorization: `Bearer ${SUPABASE_KEY ?? ''}`,
      },
      body: JSON.stringify({ messages: messages.slice(-10) }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) throw new Error(`aria-chat responded ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      window.clearTimeout(firstByteTimer);
      firstByteTimer = 0;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const event = JSON.parse(line.slice(5).trim()) as { type: string; text?: string; code?: string };
          if (event.type === 'delta' && event.text) yield event.text;
          else if (event.type === 'refusal') throw new Error('refusal');
          else if (event.type === 'error') throw new Error(event.code ?? 'upstream_error');
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    window.clearTimeout(firstByteTimer);
    window.clearTimeout(totalTimer);
    signal.removeEventListener('abort', abort);
  }
}
