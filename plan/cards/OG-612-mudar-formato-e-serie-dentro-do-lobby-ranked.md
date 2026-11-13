# OG-612 — Mudar formato (2x2/3x3) e série (md1/md3/md5) dentro do lobby Ranked

| Campo | Valor |
|---|---|
| Épico | E5 |
| Tipo | Funcionalidade |
| Prioridade | Should |
| Estimativa | 8 pts |
| Sprint | — |
| Status | Em andamento |
| Dependências | — |
| Issue | — (pedido da comunidade, 2026-11-13) |
| Regras de negócio | RN-RKL-07, RN-RKL-10, RN-RKL-21 |
| Skills | `outgun-card-workflow` |

## História
Como jogador num lobby Ranked que não enche, quero trocar o formato (2x2, 3x3...) e a série (md1, md3, md5) sem sair da sala, para não dispersar os jogadores que já estão lá.

## Contexto
- Hoje `options.ranked` e `maxPlayers` são fixos na criação da sala (`room.ts`), o `WorldState` e o `RankedLobby` nascem com a capacidade, e o registro da API publica formato/série na lista.
- Só vale na fase `lobby` (sala ainda não completa; antes do voto de mapas). Depois do voto, fixo.

## Escopo
- Mensagem nova `lobbyConfig` (c2s) com `format` e `bestOf`; o servidor valida a fase, quem pode pedir e a capacidade.
- Servidor: recriar capacidade do lobby/mundo, `formatLines` (duração do 2x2), rotação de mapas do formato, série (`newSeries`) e vagas de substitutos; reenviar `lobbyState`/lista de mapas; avisar o registro da API (lista de salas).
- Cliente (`RankedLobby.tsx`): seletores de formato e série no lobby, desabilitados fora da fase `lobby`; aviso no chat da sala a cada mudança.
- Se já houver mais jogadores que a nova capacidade, a mudança é recusada com mensagem.

## Decisões do PO (2026-11-13)
- Só o anfitrião (quem criou a sala) muda formato e série.
- A mudança desmarca "Pronto" de todos e só vale antes do voto.

## Critérios de aceite
- [ ] Anfitrião troca 3x3 → 2x2 e md1 → md3 no lobby sem ninguém sair; lista de salas reflete na hora.
- [ ] Recusada com jogadores demais para o novo formato, ou fora da fase `lobby`.
- [ ] Ranking por formato (D-65/66) usa o formato final da partida.
- [ ] Testes do servidor (`ranked-lobby`/`room`) e do cliente.

## Notas de implementação
(preenchido durante a execução)
