// Bloc compte dans l'en-tete (haut a droite) : nom de l'utilisateur connecte
// + bouton de deconnexion. Composant client (signOut de next-auth/react).
'use client';

import { signOut } from 'next-auth/react';

export function HeaderAccount({ displayName }: { displayName: string }) {
  return (
    <ul className="fr-btns-group fr-btns-group--inline fr-btns-group--sm" style={{ alignItems: 'center' }}>
      <li>
        <span
          className="fr-text--sm fr-mb-0 fr-mr-1w"
          style={{ whiteSpace: 'nowrap', color: 'var(--text-mention-grey)' }}
        >
          <span className="fr-icon-account-circle-line fr-mr-1v" aria-hidden="true" />
          {displayName}
        </span>
      </li>
      <li>
        <button
          type="button"
          className="fr-btn fr-btn--sm fr-btn--tertiary fr-btn--icon-left fr-icon-logout-box-r-line"
          onClick={() => signOut({ callbackUrl: '/sign-in' })}
        >
          Se déconnecter
        </button>
      </li>
    </ul>
  );
}
