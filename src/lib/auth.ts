// Configuration NextAuth — SSO ministériel via Keycloak (realm openwebui).
// Le token d'accès Keycloak est conservé en session serveur pour être
// ré-utilisé par le BFF quand il appelle l'API OpenWebUI.

import type { NextAuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import type { JWT } from 'next-auth/jwt';
import { env } from './env';

// Déconnexion fédérée : termine la session SSO Keycloak (pas seulement le
// cookie NextAuth) via l'endpoint RP-initiated logout, en back-channel.
// Sans cela, un nouveau « Se connecter » re-loguerait automatiquement.
async function keycloakEndSession(token: JWT): Promise<void> {
  try {
    const base = env().KEYCLOAK_ISSUER.replace(/\/$/, '');
    const url = new URL(`${base}/protocol/openid-connect/logout`);
    if (token.idToken) {
      url.searchParams.set('id_token_hint', token.idToken);
    } else {
      url.searchParams.set('client_id', env().KEYCLOAK_CLIENT_ID);
    }
    await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
  } catch (err) {
    console.warn('Keycloak end-session logout failed', err);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: env().KEYCLOAK_CLIENT_ID,
      clientSecret: env().KEYCLOAK_CLIENT_SECRET,
      issuer: env().KEYCLOAK_ISSUER,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account }) {
      // Premier appel après login : on récupère l'access token Keycloak.
      // `token.sub` est automatiquement posé par next-auth à partir du
      // claim "sub" de l'ID token — c'est l'UUID Keycloak de l'utilisateur,
      // qu'on utilise ensuite comme creator_id côté Prisma.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        // Conservé pour la déconnexion fédérée Keycloak (id_token_hint).
        token.idToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      // On expose UNIQUEMENT user.id (sub Keycloak) cote client.
      // L'access token Keycloak reste dans le JWT serveur (token) et n'est
      // JAMAIS renvoye dans l'objet session, qui est lisible cote navigateur
      // via /api/auth/session. Le BFF le lit via getToken() (next-auth/jwt).
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  events: {
    // Déclenché au signOut() NextAuth : on termine aussi la session Keycloak.
    async signOut({ token }) {
      await keycloakEndSession(token);
    },
  },
  pages: {
    signIn: '/sign-in',
  },
};
