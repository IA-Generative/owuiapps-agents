// Augmentation des types next-auth.
// - Session : expose uniquement user.id (sub Keycloak) cote client.
//   L'access token N'EST PAS dans la session (cf. src/lib/auth.ts).
// - JWT : porte l'access token Keycloak cote serveur, lu par le BFF via
//   getToken() de next-auth/jwt.

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    idToken?: string;
  }
}
