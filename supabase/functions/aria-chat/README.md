# aria-chat (optional)

Claude-powered answers for ARIA, the assistant in the portfolio's AI mode.

ARIA works without this function: by default it answers in the browser from
`supabase/functions/_shared/aria-knowledge.ts` (the facts from the site and the
resume), with no API costs. Switching this on makes typed questions go to
Claude, grounded on the same facts. Topic chips still answer instantly from
the local engine, and if the function is slow, rate-limited or down, ARIA
falls back to the local answers automatically.

## Switch it on

1. Deploy the function:

   ```bash
   npx supabase functions deploy aria-chat --project-ref hhqadycmsxsedlvdfcnn
   ```

2. Add your Anthropic API key as a secret:

   ```bash
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref hhqadycmsxsedlvdfcnn
   ```

3. In Vercel (Project → Settings → Environment Variables), add
   `VITE_ARIA_LLM` = `on`, then redeploy.

ARIA's status line then reads "Online · Claude-assisted".

To check the function: `GET https://hhqadycmsxsedlvdfcnn.supabase.co/functions/v1/aria-chat`
returns `{ ok, configured, model }`.

## Optional secrets

| Secret | Default | Purpose |
| --- | --- | --- |
| `ARIA_MODEL` | `claude-opus-5-5` | Claude model used for answers |
| `ARIA_RATE_LIMIT_PER_HOUR` | `40` | Questions per visitor per hour (per function instance) |
| `ARIA_ALLOWED_ORIGINS` | any | Comma-separated origins allowed to call it, e.g. `https://indraportfolio-psi.vercel.app` |

## Updating what ARIA knows

Edit `supabase/functions/_shared/aria-knowledge.ts`. Both the local engine and
this function read it, so redeploy the site (and the function, if it's on)
after changing it.
