// SPDX-License-Identifier: GPL-2.0-or-later
// Catálogo de mapas do heartbeat (OG-367, OG-553, D-91): a API lista os mapas jogáveis com a revisão
// ativa (chave, revisão, CRC, SHA-256). Nativo cujo CRC bate com o da pasta usa a pasta (a revisão 1);
// o resto (revisões novas de nativos, mapas da moderação e importados) é baixado da API, validado pelo
// parser e guardado em memória. As salas prendem a revisão na troca de mapa (RN-MRV-04); o texto de
// toda revisão já servida fica guardado pelo CRC, para quem ainda joga ou assiste uma partida dela.
import { parseMapFile } from '@outgun/content';
import type { GameMap } from '@outgun/sim';
import { createHash } from 'node:crypto';

export interface PanelMapRef {
  name: string;
  crc: number;
  /** Revisão ativa (OG-553); ausente na API antiga (só mapas da moderação). */
  rev?: number;
  sha256?: string;
  origin?: string;
}

/** Um mapa resolvido: geometria, texto (Latin-1) e a revisão (null = sem catálogo, ex. pasta). */
export interface CatalogEntry {
  map: GameMap;
  text: string;
  rev: number | null;
}

export class PanelMaps {
  private readonly maps = new Map<string, CatalogEntry>();
  /** Texto de cada revisão já carregada, por `nome#crc` (nunca sai: o mapa pode estar em jogo). */
  private readonly texts = new Map<string, string>();
  /** Mapas fixos do servidor fora do catálogo (T4 do Treino de mira, OG-568): o heartbeat não os tira. */
  private readonly statics = new Map<string, CatalogEntry>();
  /** Nativos fora da lista de jogáveis (desativados no painel, OG-558); vazio sem catálogo de nativos. */
  private hidden = new Set<string>();

  /**
   * `download`: texto da revisão (Latin-1), ou undefined se a API não tem; `folder`: o nativo da pasta
   * (geometria e texto), se houver.
   */
  constructor(
    private readonly download: (name: string, rev?: number) => Promise<string | undefined>,
    private readonly folder: (name: string) => { map: GameMap; text: string } | undefined = () => undefined,
    private readonly folderNames: () => readonly string[] = () => [],
  ) {}

  /** Mapa fixo do servidor, fora do catálogo (Treino de mira, OG-568): servido ao cliente como os outros. */
  addStatic(name: string, map: GameMap, text: string): void {
    this.statics.set(name, { map, text, rev: null });
  }

  /** Revisão ativa do mapa (a que entra na próxima troca de mapa). */
  entry(name: string): CatalogEntry | undefined {
    return this.maps.get(name) ?? this.statics.get(name);
  }

  map(name: string): GameMap | undefined {
    return this.entry(name)?.map;
  }

  /** Texto da revisão ativa, ou da revisão com aquele CRC (partida em andamento, replay). */
  text(name: string, crc?: number): string | undefined {
    const fixed = this.statics.get(name);
    if (fixed) return crc === undefined || crc === fixed.map.crc ? fixed.text : undefined;
    if (crc !== undefined) return this.texts.get(`${name}#${crc}`);
    return this.maps.get(name)?.text;
  }

  /** O nativo foi desativado para novas partidas? */
  isHidden(name: string): boolean {
    return this.hidden.has(name);
  }

  /** Algum mapa da lista falta ou mudou de CRC? */
  needs(list: readonly PanelMapRef[]): boolean {
    return list.some((m) => this.maps.get(m.name)?.map.crc !== m.crc && this.folder(m.name)?.map.crc !== m.crc);
  }

  private keep(name: string, entry: CatalogEntry): void {
    this.maps.set(name, entry);
    this.texts.set(`${name}#${entry.map.crc}`, entry.text);
  }

  /**
   * Fica com os mapas da lista: tira os que saíram e baixa os que faltam. Devolve os que não deu
   * para baixar ou que chegaram diferentes (CRC, SHA-256 ou parser): ficam de fora até a próxima tentativa.
   */
  async sync(list: readonly PanelMapRef[]): Promise<string[]> {
    const wanted = new Map(list.map((m) => [m.name, m]));
    for (const name of [...this.maps.keys()]) if (!wanted.has(name)) this.maps.delete(name);
    // só esconde nativos quando a API já lista nativos (API antiga: só os da moderação)
    this.hidden = list.some((m) => m.origin === 'native') ? new Set(this.folderNames().filter((n) => !wanted.has(n))) : new Set();
    const failed: string[] = [];
    for (const [name, ref] of wanted) {
      const current = this.maps.get(name);
      if (current?.map.crc === ref.crc) {
        if (ref.rev !== undefined) current.rev = ref.rev;
        continue;
      }
      const native = this.folder(name);
      if (native && native.map.crc === ref.crc) {
        this.keep(name, { map: native.map, text: native.text, rev: ref.rev ?? null });
        continue;
      }
      const text = await this.download(name, ref.rev).catch(() => undefined);
      const parsed = text === undefined ? undefined : parseMapFile(`${name}.txt`, Uint8Array.from(text, (c) => c.charCodeAt(0) & 0xff));
      const shaOk = text !== undefined && (ref.sha256 === undefined || createHash('sha256').update(Buffer.from(text, 'latin1')).digest('hex') === ref.sha256);
      if (!parsed?.ok || parsed.map.crc !== ref.crc || !shaOk) {
        failed.push(name);
        continue;
      }
      this.keep(name, { map: parsed.map, text: text!, rev: ref.rev ?? null });
    }
    return failed;
  }
}
