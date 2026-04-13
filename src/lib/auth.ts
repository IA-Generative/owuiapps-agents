// Configuration NextAuth — SSO ministériel via Keycloak (realm openwebui).
// Le token d'accès Keycloak est conservé en session serveur pour être
// ré-utilisé par le BFF quand il appelle l'API OpenWebUI.

import type { NextAuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import { env } from './env';

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
      }
      return token;
    },
    async session({ session, token }) {
      // On expose :
      //  - user.id : le sub Keycloak (UUID) pour les inserts Prisma
      //  - accessToken : pour le BFF qui proxifie vers OpenWebUI (pas client)
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      (session as typeof session & { accessToken?: string }).accessToken =
        token.accessToken as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/sign-in',
  },
};
