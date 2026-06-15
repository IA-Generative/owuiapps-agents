// Bouton de deconnexion — composant client.
// signOut() de next-auth/react fonctionne sans SessionProvider : il recupere
// le token CSRF puis POST /api/auth/signout, et redirige vers callbackUrl.
'use client';

import { signOut } from 'next-auth/react';

export function LogoutButton() {
  return (
    <button
      type="button"
      className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-logout-box-r-line"
      onClick={() => signOut({ callbackUrl: '/sign-in' })}
    >
      Se déconnecter
    </button>
  );
}
