// SPDX-License-Identifier: GPL-2.0-or-later
// Imagens nas evidências do relato de bug (OG-540, issue #29): colar (Ctrl+V) no campo ou escolher o
// arquivo. O navegador reduz a imagem (lado maior até 1920 px, WebP) antes de mandar à API, que a
// guarda e a serve num endereço público; a issue do GitHub a mostra.
import { useRef, useState, type ClipboardEvent } from 'react';
import { Button } from '../ui/Button.js';
import { api, API_URL, ApiError } from './api.js';
import { usePrefs } from './prefs.js';

export const MAX_EVIDENCE_IMAGES = 4;
const MAX_SIDE = 1920;
const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = ['image/png', 'image/jpeg', 'image/webp'];

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/** Reduz e recodifica (WebP; PNG onde o navegador não gera WebP). Também tira os metadados da foto. */
export async function shrinkImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.9, 0.75, 0.6]) {
    const webp = await toBlob(canvas, 'image/webp', quality);
    if (webp?.type === 'image/webp' && webp.size <= MAX_BYTES) return webp;
    if (webp?.type !== 'image/webp') break;
  }
  const png = await toBlob(canvas, 'image/png');
  if (png && png.size <= MAX_BYTES) return png;
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.7);
  if (jpeg && jpeg.size <= MAX_BYTES) return jpeg;
  throw new Error('image too large');
}

/** As imagens de um `ClipboardEvent` (print colado com Ctrl+V). */
export function pastedImages(ev: ClipboardEvent): File[] {
  return [...ev.clipboardData.items].filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile()).filter((f): f is File => f !== null);
}

/** Envio, miniaturas e botão de anexar; `onPaste` vai no campo de texto das evidências. */
export function useEvidenceImages(ids: readonly string[], onChange: (ids: string[]) => void) {
  const { t } = usePrefs();
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(ids);
  latest.current = ids;

  const add = (files: readonly Blob[]) => {
    const room = MAX_EVIDENCE_IMAGES - latest.current.length - busy;
    if (files.length > room) setError(t('Up to $1 images.', String(MAX_EVIDENCE_IMAGES)));
    for (const file of files.slice(0, Math.max(0, room))) {
      setBusy((n) => n + 1);
      setError(null);
      shrinkImage(file)
        .then((blob) => api<{ id: string }>('/feedback/images', { body: blob }))
        .then(
          ({ id }) => onChange([...latest.current, id]),
          (e: unknown) =>
            setError(e instanceof ApiError && e.code === 'rate_limited' ? t('Too many images for now; try again later.') : t('Could not attach the image.')),
        )
        .finally(() => setBusy((n) => n - 1));
    }
  };

  const onPaste = (ev: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = pastedImages(ev);
    if (!files.length) return; // texto segue colando normalmente
    ev.preventDefault();
    add(files);
  };

  const view = <EvidenceImageList ids={ids} busy={busy} error={error} onAdd={add} onRemove={(id) => onChange(latest.current.filter((x) => x !== id))} />;
  return { onPaste, view, busy: busy > 0 };
}

function EvidenceImageList({ ids, busy, error, onAdd, onRemove }: { readonly ids: readonly string[]; readonly busy: number; readonly error: string | null; readonly onAdd: (files: Blob[]) => void; readonly onRemove: (id: string) => void }) {
  const { t } = usePrefs();
  const input = useRef<HTMLInputElement>(null);
  const full = ids.length + busy >= MAX_EVIDENCE_IMAGES;
  return (
    <div className="evidence-images">
      {(ids.length > 0 || busy > 0) && (
        <ul className="evidence-images-list">
          {ids.map((id, i) => (
            <li key={id}>
              <a href={`${API_URL}/feedback/images/${id}`} target="_blank" rel="noreferrer">
                <img src={`${API_URL}/feedback/images/${id}`} alt={t('Image $1', String(i + 1))} />
              </a>
              <button type="button" className="evidence-images-remove" aria-label={t('Remove image $1', String(i + 1))} title={t('Remove')} onClick={() => onRemove(id)}>
                ×
              </button>
            </li>
          ))}
          {Array.from({ length: busy }, (_, i) => (
            <li key={`busy-${i}`} className="evidence-images-busy" aria-label={t('Sending image...')}>
              ...
            </li>
          ))}
        </ul>
      )}
      <div className="evidence-images-actions">
        <Button disabled={full} onClick={() => input.current?.click()}>
          {t('Attach image')}
        </Button>
        <span className="evidence-images-hint">{t('Or paste a screenshot (Ctrl+V) in the field above.')}</span>
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT.join(',')}
        multiple
        hidden
        onChange={(ev) => {
          onAdd([...(ev.target.files ?? [])]);
          ev.target.value = '';
        }}
      />
      {error && (
        <p className="ui-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
