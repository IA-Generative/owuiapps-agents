// Étape 2 — Comportement (§3.1).
// Lit / écrit via useWizard() depuis _context.tsx.

'use client';

import { useState } from 'react';
import {
  AVAILABLE_MODELS,
  TIER_LABELS,
  TIER_COLORS,
  getModelById,
  type ModelProfile,
} from '@/lib/models';
import { useWizard } from '../_context';

export function StepBehavior() {
  const { draft, update } = useWizard();
  const [busy, setBusy] = useState<null | 'assist' | 'optimize' | 'starters'>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = getModelById(draft.modelId);

  async function callPromptBff(path: string, kind: 'assist' | 'optimize') {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: draft.systemPrompt, hints: {} }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        setError(`Erreur ${res.status} : ${detail.error ?? 'inconnue'}`);
        return;
      }
      const data = await res.json();
      if (typeof data.prompt === 'string') update({ systemPrompt: data.prompt });
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(null);
    }
  }

  async function generateStarters() {
    if (!draft.systemPrompt || draft.systemPrompt.trim().length < 20) {
      setError('Le prompt système doit faire au moins 20 caractères pour générer une amorce.');
      return;
    }
    setBusy('starters');
    setError(null);
    try {
      const res = await fetch('/api/ab/prompt/suggest-starters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: draft.systemPrompt, count: 4 }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        setError(`Erreur ${res.status} : ${detail.error ?? 'inconnue'}`);
        return;
      }
      const data = (await res.json()) as { greeting?: string; examples?: string[] };
      const patch: Partial<{ greeting: string; examples: string[] }> = {};
      if (typeof data.greeting === 'string') patch.greeting = data.greeting;
      if (Array.isArray(data.examples)) patch.examples = data.examples;
      update(patch);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(null);
    }
  }

  function updateExample(index: number, value: string) {
    update({
      examples: draft.examples.map((e, i) => (i === index ? value : e)),
    });
  }

  function addExample() {
    if (draft.examples.length >= 6) return;
    update({ examples: [...draft.examples, ''] });
  }

  function removeExample(index: number) {
    update({ examples: draft.examples.filter((_, i) => i !== index) });
  }

  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      {/* ---- System prompt + assist / optimize ---- */}
      <div className="fr-col-12">
        <div className="fr-input-group">
          <label className="fr-label" htmlFor="system-prompt">
            Instructions système
            <span className="fr-hint-text">
              Décris le rôle, le public, le ton et les contraintes de l&apos;agent.
              Si tu hésites, clique sur « Aide-moi à écrire ». 10 000 caractères max.
            </span>
          </label>
          <textarea
            className="fr-input"
            id="system-prompt"
            rows={10}
            maxLength={10000}
            value={draft.systemPrompt}
            onChange={(e) => update({ systemPrompt: e.target.value })}
            placeholder={`Ex :

Tu es un assistant spécialisé dans la rédaction de notes juridiques pour les agents
de la DLPAJ. Ton rôle est d'aider à produire des notes claires, structurées et
juridiquement rigoureuses à partir d'une question posée par l'utilisateur.

Public : agents de la Direction des libertés publiques et des affaires juridiques.
Ton : formel, précis, sans jargon excessif.

Contraintes :
- Cite systématiquement les articles de loi et textes réglementaires applicables
- Ne jamais inventer de références juridiques
- Structure tes notes en 3 parties : rappel du cadre légal, analyse, préconisation
- Si la question dépasse ton périmètre, indique-le clairement
- Réponds toujours en français administratif`}
          />
        </div>
        <div className="fr-btns-group fr-btns-group--inline">
          <button
            type="button"
            className="fr-btn fr-btn--secondary"
            disabled={busy !== null}
            onClick={() => callPromptBff('/api/ab/prompt/assist', 'assist')}
          >
            {busy === 'assist' ? 'Génération…' : 'Aide-moi à écrire'}
          </button>
          <button
            type="button"
            className="fr-btn fr-btn--secondary"
            disabled={busy !== null || !draft.systemPrompt}
            onClick={() => callPromptBff('/api/ab/prompt/optimize', 'optimize')}
          >
            {busy === 'optimize' ? 'Optimisation…' : 'Optimiser mon prompt'}
          </button>
        </div>
        {error && (
          <div className="fr-alert fr-alert--error fr-alert--sm fr-mt-2w">
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* ---- Amorce + exemples générés ---- */}
      <div className="fr-col-12">
        <div className="fr-input-group">
          <label className="fr-label" htmlFor="greeting">
            Amorce de conversation
            <span className="fr-hint-text">
              Message d&apos;accueil affiché à l&apos;utilisateur au lancement de l&apos;agent.
            </span>
          </label>
          <textarea
            className="fr-input"
            id="greeting"
            rows={3}
            maxLength={500}
            value={draft.greeting}
            onChange={(e) => update({ greeting: e.target.value })}
            placeholder="Ex : Bonjour, je suis votre assistant de rédaction juridique. Posez-moi une question sur le CESEDA et je vous aiderai à préparer une note structurée, sourcée sur les textes en vigueur."
          />
        </div>
        <button
          type="button"
          className="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-magic-wand-line"
          disabled={busy !== null || draft.systemPrompt.trim().length < 20}
          onClick={generateStarters}
        >
          {busy === 'starters' ? 'Génération…' : 'Générer amorce + exemples depuis le prompt'}
        </button>
      </div>

      <div className="fr-col-12">
        <fieldset className="fr-fieldset">
          <legend className="fr-fieldset__legend">
            <span className="fr-fieldset__legend--regular">Exemples de prompts (cliquables)</span>
            <span className="fr-hint-text">
              Jusqu&apos;à 6 suggestions proposées à l&apos;utilisateur final. Peut être
              généré depuis le prompt système avec le bouton ci-dessus, ou saisi à la main.
            </span>
          </legend>
          <div className="fr-fieldset__content">
            {draft.examples.length === 0 && (
              <p className="fr-text--sm" style={{ color: 'var(--text-mention-grey)' }}>
                Aucun exemple pour l&apos;instant.
              </p>
            )}
            {draft.examples.map((example, i) => (
              <div
                key={i}
                className="fr-mb-2w"
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}
              >
                <input
                  type="text"
                  className="fr-input"
                  value={example}
                  maxLength={200}
                  onChange={(e) => updateExample(i, e.target.value)}
                  placeholder={
                    [
                      'Ex : Comment contester un refus de visa ?',
                      'Ex : Quels sont les délais pour un recours gracieux ?',
                      'Ex : Peut-on refuser un titre de séjour pour ordre public ?',
                      'Ex : Rédige-moi une note sur le droit d\'asile.',
                      'Ex : Synthétise ce dossier en 5 points clés.',
                      'Ex : Compare ces deux articles du CESEDA.',
                    ][i] ?? "Ex : ma question pour l'agent…"
                  }
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="fr-btn fr-btn--tertiary fr-btn--sm fr-icon-delete-line"
                  title="Retirer cet exemple"
                  onClick={() => removeExample(i)}
                >
                  Retirer
                </button>
              </div>
            ))}
            {draft.examples.length < 6 && (
              <button
                type="button"
                className="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-add-line"
                onClick={addExample}
              >
                Ajouter un exemple
              </button>
            )}
          </div>
        </fieldset>
      </div>

      {/* ---- Sélecteur de modèle de base ---- */}
      <div className="fr-col-12">
        <fieldset className="fr-fieldset">
          <legend className="fr-fieldset__legend">
            <span className="fr-fieldset__legend--regular">Modèle de base</span>
            <span className="fr-hint-text">
              Choisissez le moteur IA selon la nature des tâches. Les modèles « léger »
              sont rapides et économes ; les modèles « raisonnement » ou « puissant »
              sont plus précis mais plus lents.
            </span>
          </legend>
          <div className="fr-fieldset__content">
            {AVAILABLE_MODELS.map((m) => (
              <ModelRadioCard
                key={m.id}
                model={m}
                checked={m.id === draft.modelId}
                onSelect={() => update({ modelId: m.id })}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <div className="fr-col-12 fr-col-md-6">
        <label className="fr-label" htmlFor="temperature">
          Température (Précis ↔ Créatif) — {draft.temperature.toFixed(1)}
        </label>
        <input
          className="fr-range"
          id="temperature"
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={draft.temperature}
          onChange={(e) => update({ temperature: Number(e.target.value) })}
        />
      </div>

      {selectedModel && (
        <div className="fr-col-12">
          <div className="fr-callout">
            <h3 className="fr-callout__title">Résumé : {selectedModel.label}</h3>
            <p className="fr-callout__text">{selectedModel.shortPitch}</p>
            <p className="fr-text--sm fr-mb-0">
              <strong>Recommandé pour</strong> : {selectedModel.recommendedFor.join(' · ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ModelRadioCard({
  model,
  checked,
  onSelect,
}: {
  model: ModelProfile;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className="fr-radio-rich"
      style={{
        border: checked
          ? '2px solid var(--border-active-blue-france)'
          : '1px solid var(--border-default-grey)',
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '0.5rem',
        cursor: 'pointer',
      }}
      onClick={onSelect}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <input
          type="radio"
          name="model"
          value={model.id}
          checked={checked}
          onChange={onSelect}
          style={{ marginTop: '0.25rem' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <strong>{model.label}</strong>
            <span className={`fr-badge fr-badge--sm ${TIER_COLORS[model.tier]}`}>
              {TIER_LABELS[model.tier]}
            </span>
            <span className="fr-text--sm" style={{ color: 'var(--text-mention-grey)' }}>
              {model.family}
            </span>
          </div>
          <p className="fr-mt-1w fr-mb-1w">{model.shortPitch}</p>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
            <span>
              Vitesse : <Indicator value={model.latency} />
            </span>
            <span>
              Coût tokens : <Indicator value={model.cost} />
            </span>
          </div>
          {checked && (
            <details className="fr-mt-2w">
              <summary className="fr-text--sm" style={{ cursor: 'pointer' }}>
                Plus de détails
              </summary>
              <div className="fr-mt-1w fr-text--sm">
                <p className="fr-mb-1w">
                  <strong>Points forts :</strong>
                </p>
                <ul className="fr-mb-2w">
                  {model.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p className="fr-mb-1w">
                  <strong>Limites :</strong>
                </p>
                <ul className="fr-mb-0">
                  {model.tradeoffs.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function Indicator({ value }: { value: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span style={{ letterSpacing: '2px' }}>
      {'●'.repeat(value)}
      <span style={{ opacity: 0.3 }}>{'●'.repeat(5 - value)}</span>
    </span>
  );
}
