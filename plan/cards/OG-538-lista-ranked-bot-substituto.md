# OG-538 — Lista Ranked: o bot substituto não fecha a sala para quem foi substituído

| Campo | Valor |
|---|---|
| Épico | E8 |
| Tipo | Bug |
| Prioridade | Must |
| Estimativa | 1 pt |
| Sprint | — (fora de sprint, v2.57.3) |
| Status | Concluído |
| Dependências | OG-262, OG-525 |
| Regras de negócio | RN-RKL-18/19, RN-CUP-09 |
| Skills | `outgun-card-workflow` |

## História
Como jogador substituído pelo bot numa partida Ranked ou da OutCup, quero clicar na sala da lista e voltar para a minha vaga.

## Contexto
- Incidente de 2026-11-01, semifinal da OutCup (ozzylords + Felix × Slim + coiote, sala `c-tcnfhkm9`): a tela de ozzylords ficou preta ao entrar (app da Steam), ele saiu e o `BOT-ozzylords` assumiu a vaga. Na lista, a sala aparecia "Lotada" e o clique não fazia nada (nem pedido de ingresso).
- Causa: a aba Ranked contava os bots na ocupação (`players >= maxPlayers`); a aba Casual já contava só humanos (OG-445). O servidor sempre aceitou a volta pela conta (`Room.resume`, OG-262).
- Confronto remarcado no banco (aberto e depois marcado para 23:32 UTC; `admin_actions` `cup_reschedule`, via claude-code), sala nova `c-zlagrrhf`; Slim + coiote venceram por 2 a 0.

## Escopo
- `isFull` da lista Ranked conta só humanos (`apps/web/src/screens/ranked-rooms.tsx`); quem não é do confronto segue recusado pelo servidor.

## Critérios de aceite
- [x] Sala com bot substituto não aparece lotada na aba Ranked.
- [x] v2.57.3 no beta e na branch beta da Steam (build 26368168).

## Notas de implementação
- A tela preta do app da Steam ficou sem causa confirmada (sem console no app e sem Sentry no cliente); proposta em OG-539 (perda do contexto WebGL, console no app, coleta de erros).
