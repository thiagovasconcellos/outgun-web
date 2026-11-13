# OG-612 — Mudar formato (2x2/3x3) e série (md1/md3/md5) dentro do lobby Ranked

| Campo | Valor |
|---|---|
| Épico | E5 |
| Tipo | Funcionalidade |
| Prioridade | Should |
| Estimativa | 8 pts |
| Sprint | — |
| Status | Em revisão |
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
- Plano A: o anfitrião (claim `spawn.ownerId`, vindo de `rooms.owner_id`) manda `lobbyConfig` (msg 137); o spawner avisa a API (`POST /internal/rooms/reconfigure` atualiza format/bestOf/maxPlayers), fecha a sala com o código 4020 `reconfigured` e abre outra com o mesmo id. O cliente remonta (`onReconfigured`) e pega ticket novo.
- Só vale em fase `lobby` com 0 jogos da série (md3/md5 em andamento: travado) e fora da OutCup; recusa se houver mais jogadores que o novo formato. UI: dois seletores no lobby, só para o anfitrião.
- Pendente: testes (spawner/`room`/API) na verificação da sprint; lados e votos recomeçam na sala nova.
