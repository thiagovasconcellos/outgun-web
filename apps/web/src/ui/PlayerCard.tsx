// SPDX-License-Identifier: GPL-2.0-or-later
// Carta de Jogador (OG-572, D-94, RN-CRT-01/06): boneco, nick e classe, com a escada de
// exclusividade — cada classe acrescenta estrelas, moldura, fundo, acabamento do nome, reflexo,
// movimento e número da cópia. Medidas em `cqw` (largura da carta): qualquer tamanho.
import { useLayoutEffect, useRef, type CSSProperties, type PointerEvent } from 'react';
import { cardClass, SHOWS_SERIAL_FROM_TIER, type CardClassId } from '@outgun/protocol';
import { cardCracksSvg, cardFrameSvg, cardSerialText, drawCardArt, drawCardBackground, type CardLook } from './player-card.js';
import './player-card.css';

export interface PlayerCardProps {
  /** Frente da carta; sem `look`, o verso. */
  readonly look?: CardLook | null;
  /** Número da cópia (mostrado a partir do Lendário); ausente = não é de ninguém (prévia). */
  readonly serial?: number | null;
  /** Só a sombra do boneco (abertura do resgate). */
  readonly silhouette?: boolean;
  /** Verso na cor da classe (suspense da abertura). */
  readonly backClass?: CardClassId | null;
  /** Sem efeitos animados (grade grande: só a carta sob o mouse anima). */
  readonly still?: boolean;
  readonly className?: string;
  readonly label?: string;
}

/** Diminui a fonte até o texto caber na largura. */
function fitWidth(el: HTMLElement | null) {
  if (!el) return;
  el.style.fontSize = '';
  let s = parseFloat(getComputedStyle(el).fontSize);
  for (let k = 0; el.scrollWidth > el.clientWidth + 1 && s > 6 && k < 60; k++) {
    s *= 0.94;
    el.style.fontSize = `${s}px`;
  }
}

export function PlayerCard({ look, serial, silhouette = false, backClass, still = false, className, label }: PlayerCardProps) {
  const root = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLCanvasElement>(null);
  const art = useRef<HTMLCanvasElement>(null);
  const nick = useRef<HTMLDivElement>(null);
  const cls = cardClass(look?.class ?? backClass ?? 'epico');
  const back = !look;
  const t = back ? 1 : cls.tier;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const draw = () => {
      if (bg.current) drawCardBackground(bg.current, look ?? null, t, cls.c1);
      if (look && art.current) drawCardArt(art.current, look, silhouette);
      fitWidth(nick.current);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    void document.fonts?.ready.then(draw);
    return () => ro.disconnect();
  }, [look, silhouette, t, cls.c1]);

  // reflexo que segue o mouse (Lendário em diante)
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (t < 2 || back) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    e.currentTarget.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };
  const style = { '--c1': cls.c1, '--c2': cls.c2 } as CSSProperties;
  const classes = ['pc', `pc-t${t}`, back ? 'pc-back' : '', silhouette ? 'pc-silhouette' : '', still ? 'pc-still' : '', className ?? ''].filter(Boolean).join(' ');
  const showSerial = !back && !silhouette && serial != null && t >= SHOWS_SERIAL_FROM_TIER;
  return (
    <div ref={root} className={classes} style={style} onPointerMove={move} role="img" aria-label={label ?? (back ? 'Outgun Player Cards' : `${look.nick}, ${cls.name}`)}>
      <canvas ref={bg} className="pc-bg" aria-hidden="true" />
      {!back && t === 4 && <svg className="pc-cracks" viewBox="0 0 300 400" aria-hidden="true" dangerouslySetInnerHTML={{ __html: cardCracksSvg(look.nick) }} />}
      <svg className="pc-frame" viewBox="0 0 300 400" aria-hidden="true" dangerouslySetInnerHTML={{ __html: cardFrameSvg(t) }} />
      {back ? (
        <div className="pc-inner pc-inner-back" aria-hidden="true">
          <div className="pc-logo">OUTGUN</div>
          <div className="pc-sub">Player Cards</div>
        </div>
      ) : (
        <div className="pc-inner" aria-hidden="true">
          <div className="pc-box pc-head">
            <div className="pc-logo">OUTGUN</div>
            <div className="pc-sub">Carta de jogador</div>
          </div>
          <div className="pc-art">
            {t === 5 && !silhouette && <div className="pc-aura" />}
            <canvas ref={art} />
          </div>
          <div className="pc-box pc-name">
            <div ref={nick} className="pc-nick">
              {silhouette ? '???' : look.nick}
            </div>
          </div>
          <div className="pc-class">
            <span>{cls.name}</span>
            <span className="pc-stars">{'★'.repeat(t + 1)}</span>
          </div>
        </div>
      )}
      {showSerial && <div className="pc-serial">Nº {cardSerialText(serial, look.class)}</div>}
      {!back && !silhouette && t >= 2 && <div className="pc-foil" aria-hidden="true" />}
    </div>
  );
}
