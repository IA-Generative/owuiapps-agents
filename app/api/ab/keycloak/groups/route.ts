// BFF — retourne les groupes de l'utilisateur connecté, extraits directement
// du claim `groups` dans son access token Keycloak.
//
// Prérequis : un mapper "Group Membership" (claim name = "groups", full path
// = true, add to access token = true) doit être configuré sur le client
// `miraiku-agents` dans Keycloak. Fait via kcadm au provisioning.
//
// Avantage par rapport à l'Admin API : zéro credentials admin côté BFF,
// zéro appel réseau supplémentaire — on décode simplement le JWT.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { env } from '@/lib/env';

type GroupEntry = {
  path: string;
  name: string;
};

function decodeTokenGroups(accessToken: string | undefined): string[] {
  if (!accessToken) return [];
  try {
    // JWT = header.payload.signature. On décode le payload SANS vérifier la
    // signature : c'est intentionnel et sûr ici car la source du token est de
    // confiance — getToken() (appelé en amont) a déjà validé et déchiffré le
    // JWT NextAuth, lui-même obtenu via le flux OIDC Keycloak. On ne lit donc
    // que des claims déjà authentifiés, jamais un token fourni par le client.
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf-8'),
    );
    const groups = payload.groups;
    if (Array.isArray(groups) && groups.every((g: unknown) => typeof g === 'string')) {
      return groups;
    }
  } catch {
    // Token malformé ou claim absent → pas de groupes
  }
  return [];
}

function groupPathToEntry(path: string): GroupEntry {
  // "/community/juridique" → name = "juridique"
  const segments = path.split('/').filter(Boolean);
  return {
    path,
    name: segments[segments.length - 1] || path,
  };
}

export async function GET(req: NextRequest) {
  // L'access token Keycloak n'est plus expose dans la session : on lit le
  // JWT NextAuth cote serveur (depuis le cookie) via getToken().
  const token = await getToken({ req, secret: env().NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rawGroups = decodeTokenGroups(token.accessToken);

  if (rawGroups.length === 0) {
    // Pas d'erreur — l'utilisateur n'est dans aucun groupe, ou le mapper
    // n'est pas en place (il faut se re-loguer pour que le token inclue
    // le claim mis à jour).
    return NextResponse.json({
      groups: [],
      hint: rawGroups.length === 0
        ? 'Aucun groupe trouvé dans le token. Si vous venez d\'ajouter le mapper, déconnectez-vous puis reconnectez-vous pour rafraîchir le token.'
        : undefined,
    });
  }

  const groups: GroupEntry[] = rawGroups.map(groupPathToEntry);
  return NextResponse.json({ groups });
}
