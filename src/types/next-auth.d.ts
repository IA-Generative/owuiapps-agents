// Augmentation des types next-auth pour inclure user.id (sub Keycloak) et
// accessToken dans la session serveur.

import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    accessToken?: string;
  }
}
