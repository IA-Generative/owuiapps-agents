// Accès rapide DSFR (haut à droite) : nom de l'utilisateur connecté + bouton
// de déconnexion. Même présentation que les quickAccessItems de MyVault
// (liens icône+texte groupés dans fr-btns-group). Composant client (signOut).
'use client';

import { signOut } from 'next-auth/react';

export function HeaderAccount({ displayName }: { displayName: string }) {
  return (
    <ul className="fr-btns-group">
      <li>
        <span
          className="fr-btn fr-btn--tertiary-no-outline fr-icon-account-circle-line fr-btn--icon-left"
          style={{ cursor: 'default' }}
        >
          {displayName}
        </span>
      </li>
      <li>
        <button
          type="button"
          className="fr-btn fr-icon-logout-box-r-line fr-btn--icon-left"
          onClick={() => signOut({ callbackUrl: '/sign-in' })}
        >
          Se déconnecter
        </button>
      </li>
    </ul>
  );
}
