// SPDX-License-Identifier: GPL-2.0-or-later
// Bandeira do país de uma região de servidor (OG-547, RN-REG-04). SVG do pacote flag-icons (MIT):
// emoji de bandeira não aparece no Windows. Só os países com servidor oficial (ou previstos) entram,
// para não levar as ~270 bandeiras ao build; região fora da lista mostra só o nome.
import type { Locale } from '@outgun/i18n';
import br from 'flag-icons/flags/4x3/br.svg?url';
import de from 'flag-icons/flags/4x3/de.svg?url';
import es from 'flag-icons/flags/4x3/es.svg?url';
import pt from 'flag-icons/flags/4x3/pt.svg?url';
import { usePrefs } from '../app/prefs.js';

const FLAGS: Readonly<Record<string, string>> = { br, de, es, pt };

/** A região é um código de país ISO 3166-1 alfa-2 (`br`, `es`); `local`, `eu` etc. não são. */
export function isCountryRegion(region: string | null | undefined): region is string {
  return typeof region === 'string' && /^[a-z]{2}$/.test(region);
}

/** Nome do país na língua do jogador ("Brasil", "Spain"); região que não é país volta como veio. */
export function regionName(region: string, locale: Locale): string {
  if (!isCountryRegion(region)) return region;
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(region.toUpperCase()) ?? region;
  } catch {
    return region;
  }
}

/** Bandeira com o nome do país como texto alternativo e dica; sem bandeira, nada. */
export function RegionFlag({ region }: { region: string | null | undefined }) {
  const { prefs } = usePrefs();
  if (!isCountryRegion(region) || !FLAGS[region]) return null;
  const name = regionName(region, prefs.locale);
  return <img className="og-flag" src={FLAGS[region]} alt={name} title={name} width={20} height={15} />;
}

/**
 * Coluna Região das listas de salas (OG-598, RN-REG-07): bandeira e nome do país; sala sem região, "—".
 * Em tela estreita fica só a bandeira, que leva o nome como texto alternativo.
 */
export function RegionLabel({ region }: { region: string | null | undefined }) {
  const { prefs } = usePrefs();
  if (!region) return <>—</>;
  const flagged = isCountryRegion(region) && FLAGS[region] !== undefined;
  return (
    <span className="og-region">
      <RegionFlag region={region} />
      <span className={flagged ? 'og-region-name' : undefined}>{regionName(region, prefs.locale)}</span>
    </span>
  );
}

/** Bandeira e, ao lado, um texto (ex.: nome da sala no painel da tela inicial). */
export function RegionCell({ region, children }: { region: string | null | undefined; children: React.ReactNode }) {
  return (
    <span className="og-region">
      <RegionFlag region={region} />
      {children}
    </span>
  );
}
