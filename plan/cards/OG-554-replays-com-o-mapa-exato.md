# OG-554 — Replays com o mapa exato da partida (inclusive nativos)

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S60 |
| Status | Pronto |
| Dependências | OG-552, OG-553 |
| Regras de negócio | RN-MRV-05 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu (arquiteto de mapas da comunidade), 2026-11-02 — cópia em `plan/specs/mapas-revisoes/`. Decisão D-91.

## História
Como jogador, quero rever uma partida antiga com as paredes que ela teve, mesmo depois que o mapa for revisado.

## Contexto
- O cabeçalho do replay (`packages/protocol/src/replay.ts`) só traz `mapText` em mapas gerados e da moderação (`room.ts` `startRecording`); nativo é lido dos assets pelo nome.
- Bug confirmado no código: `replay-host.ts:277` só recarrega a geometria quando o **nome** muda; dois replays seguidos do mesmo mapa com revisões diferentes reaproveitam a geometria errada. Divergência de CRC vira só `console.warn` (linha 302).
- Os replays antigos já trazem o CRC do mapa no `mapChange` do estado inicial.

## Escopo
- Todo replay novo grava `mapText`, `mapRevision` e `mapSha256` (campos opcionais: `REPLAY_VERSION` continua 1, replays antigos seguem válidos).
- Replay antigo sem texto: resolve pela chave legada + CRC gravado na revisão correspondente (nativo → revisão 1, comprovada pelo achado do OG-552). Sem revisão com aquele CRC: toca com aviso visível "o mapa desta partida não foi encontrado; a geometria pode estar diferente".
- `replay-host` recarrega quando muda nome **ou** conteúdo (SHA-256/CRC), e mostra o aviso de divergência na tela, não só no console.

## Critérios de aceite
- [ ] Replay antigo de Larhi (círculos) continua com círculos depois da revisão de cantos retos (há 6 partidas reais de Larhi com replay em produção, de 2026-10-23 a 2026-11-02).
- [ ] Dois replays seguidos de revisões diferentes do mesmo mapa mostram cada um a sua geometria.
- [ ] CRC divergente mostra aviso na tela.

## Notas de implementação
