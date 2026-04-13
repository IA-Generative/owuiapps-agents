// BFF — GET / PUT / DELETE /api/ab/agents/:id
// GET  : retourne l'agent + son dernier config snapshot (pour hydrater le wizard edit)
// PUT  : met a jour l'agent (nouvelle version dans ab_agent_versions)
// DELETE : soft delete (status = archived)

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function requireOwner(agentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, res: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  });
  if (!agent) {
    return { ok: false as const, res: NextResponse.json({ error: 'not_found' }, { status: 404 }) };
  }
  if (agent.creatorId !== session.user.id) {
    return { ok: false as const, res: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { ok: true as const, agent, session };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const r = await requireOwner(params.id);
  if (!r.ok) return r.res;

  const snapshot = r.agent.versions[0]?.configSnapshot ?? {};

  return NextResponse.json({
    id: r.agent.id,
    owuiModelId: r.agent.owuiModelId,
    status: r.agent.status,
    visibility: r.agent.visibility,
    category: r.agent.category,
    version: r.agent.version,
    createdAt: r.agent.createdAt,
    updatedAt: r.agent.updatedAt,
    config: snapshot,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const r = await requireOwner(params.id);
  if (!r.ok) return r.res;

  const body = await req.json().catch(() => ({}));

  const newVersion = r.agent.version + 1;
  const visibility = body.visibility ?? r.agent.visibility;
  const status = body.status ?? r.agent.status;

  const configSnapshot = {
    name: body.name ?? '',
    description: body.description ?? '',
    category: body.category ?? '',
    visibility,
    communityPath: body.communityPath ?? null,
    systemPrompt: body.systemPrompt ?? '',
    greeting: body.greeting ?? '',
    examples: body.examples ?? [],
    modelId: body.modelId ?? null,
    temperature: body.temperature ?? 0.7,
  };

  try {
    await prisma.$transaction([
      prisma.agent.update({
        where: { id: params.id },
        data: {
          visibility,
          status,
          category: body.category ? [body.category] : r.agent.category,
          version: newVersion,
        },
      }),
      prisma.agentVersion.create({
        data: {
          agentId: params.id,
          version: newVersion,
          configSnapshot,
          changelog: body.changelog ?? 'Modification via le wizard',
        },
      }),
    ]);

    return NextResponse.json({ id: params.id, version: newVersion, status });
  } catch (err) {
    return NextResponse.json(
      { error: 'update_failed', detail: String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const r = await requireOwner(params.id);
  if (!r.ok) return r.res;

  await prisma.agent.update({
    where: { id: params.id },
    data: { status: 'archived' },
  });

  return NextResponse.json({ id: params.id, status: 'archived' });
}
