// Lista de mundos guardados (P1.5, D51): cargar y borrar. Cargar regenera el mundo desde sus
// parámetros (la URL) y continúa la historia guardada.
import { formatYear } from '@ws/i18n';
import { useTranslation } from 'react-i18next';
import type { SavedWorld } from './world-store';

export interface SavedWorldsProps {
  readonly worlds: readonly SavedWorld[];
  readonly onLoad: (world: SavedWorld) => void;
  readonly onRemove: (world: SavedWorld) => void;
}

export function SavedWorlds({ worlds, onLoad, onRemove }: SavedWorldsProps) {
  const { t, i18n } = useTranslation();
  return (
    <section className="saved-worlds">
      <p className="eyebrow">{t('live.saves.title')}</p>
      {worlds.length === 0 ? (
        <p className="meta">{t('live.saves.empty')}</p>
      ) : (
        <ul>
          {worlds.map((w) => (
            <li key={w.id}>
              <span>
                {t('live.saves.item', {
                  seed: w.params.seed,
                  size: t(`content.worldSize.${w.params.size}` as 'content.worldSize.medium'),
                  year: formatYear(i18n, w.lastYear),
                })}
              </span>
              <button
                type="button"
                onClick={() => {
                  onLoad(w);
                }}
              >
                {t('live.saves.load')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemove(w);
                }}
              >
                {t('live.saves.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
