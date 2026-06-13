// BFF — "Aide-moi à écrire" (§3.1).
// Appelle Scaleway Generative APIs directement (via src/lib/scw-llm-client).
// Modèle : gpt-oss-120b (default, alignement avec DEFAULT_MODELS du socle).

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scwChatCompletions, ScwLlmUnavailableError } from '@/lib/scw-llm-client';

const SYSTEM_META_PROMPT = `Tu es un assistant qui aide un agent du Ministère de l'Intérieur
à rédiger un prompt système pour son propre agent IA. Propose un prompt structuré, clair,
en français, avec des sections : rôle, public, ton, contraintes. Retourne UNIQUEMENT le
prompt système proposé, sans préambule, sans commentaire, sans guillemets.`;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    prompt?: string;
    hints?: Record<string, string>;
  };

  const userMessage =
    `Informations fournies par l'utilisateur :\n` +
    JSON.stringify(body.hints ?? {}, null, 2) +
    `\n\nPrompt actuel (vide si nouveau) :\n${body.prompt ?? '(vide)'}\n\n` +
    `Génère ou améliore le prompt système.`;

  try {
    const completion = await scwChatCompletions({
      messages: [
        { role: 'system', content: SYSTEM_META_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.5,
    });
    const generated = completion.choices?.[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ prompt: generated });
  } catch (err) {
    if (err instanceof ScwLlmUnavailableError) {
      return NextResponse.json(
        { error: 'llm_not_configured', detail: err.message },
        { status: 501 },
      );
    }
    console.error('assist upstream_failure', err);
    return NextResponse.json({ error: 'upstream_failure' }, { status: 502 });
  }
}
