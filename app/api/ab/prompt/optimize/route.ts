// BFF — "Optimiser mon prompt" (§3.1).
// Même squelette que /assist : appel direct à Scaleway Generative APIs.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scwChatCompletions, ScwLlmUnavailableError } from '@/lib/scw-llm-client';

const OPTIMIZER_PROMPT = `Tu es un assistant qui réécrit des prompts système pour des
agents IA ministériels. Améliore la clarté, la structure, ajoute des garde-fous si
manquants (ne jamais inventer de sources juridiques, citer les textes, limiter les
réponses au périmètre de l'agent). Retourne UNIQUEMENT le prompt amélioré, sans
préambule ni commentaire.`;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { prompt?: string };
  if (!body.prompt || body.prompt.trim().length === 0) {
    return NextResponse.json({ error: 'prompt_required' }, { status: 400 });
  }

  try {
    const completion = await scwChatCompletions({
      messages: [
        { role: 'system', content: OPTIMIZER_PROMPT },
        { role: 'user', content: body.prompt },
      ],
      temperature: 0.4,
    });
    const optimized = completion.choices?.[0]?.message?.content?.trim() ?? body.prompt;
    return NextResponse.json({ prompt: optimized });
  } catch (err) {
    if (err instanceof ScwLlmUnavailableError) {
      return NextResponse.json(
        { error: 'llm_not_configured', detail: err.message },
        { status: 501 },
      );
    }
    console.error('optimize upstream_failure', err);
    return NextResponse.json({ error: 'upstream_failure' }, { status: 502 });
  }
}
