# OG-450 — Convidar amigo da Steam no lobby Ranked

| Campo | Valor |
|---|---|
| Épico | E12 |
| Tipo | Feature |
| Prioridade | Could |
| Estimativa | 3 pts |
| Sprint | S62 |
| Status | Em revisão |
| Dependências | OG-447, D-82 |
| Regras de negócio | RN-RKL-07..12 |
| Skills | `outgun-card-workflow` |

## História
Como jogador na Steam montando um Ranked, quero chamar amigos da Steam para o lobby, para fechar os times com quem eu jogo.

## Contexto
- O lobby Ranked (`apps/web/src/screens/RankedLobby.tsx`, OG-256) fica por cima da partida enquanto a sala não está em jogo. As ações vão ao game server (`lobbyReady`/`lobbyVote`/`lobbySide`).
- Ranked exige conta: o amigo convidado sem sessão cai no login e precisa voltar para a sala depois dele.
- Regras do convite no Ranked (D-82, decidida pelo PO em 2026-10-27): o convidado entra no time de quem convidou; depois que todos marcam "Pronto" o convite fica inválido; em clã x clã qualquer um pode ser convidado.

## Escopo
- Botão "Convidar (Steam)" no lobby Ranked, só com `steamAvailable()`, desligado com o time de quem convida cheio ou com todos prontos.
- Convidado sem conta: login → volta para `/rooms/<id>` (manter o destino no fluxo de login).
- O convite leva quem convidou (pid/conta); o game server põe o convidado no time dele (`lobbySide`). Time cheio na chegada: entra no lado livre normal.
- Convite inválido depois que todos marcam "Pronto": o game server recusa a entrada pelo convite e o convidado vê o aviso; o lobby da Steam deixa de ser `joinable`.
- Sem restrição de clã: em clã x clã qualquer um pode ser convidado.

## Critérios de aceite
- [x] O botão aparece só no app aberto pela Steam e fica desligado com o time cheio ou com todos prontos.
- [x] O convidado sem sessão faz login e cai no lobby da sala convidada.
- [x] O convidado entra no time de quem convidou (teste no game server).
- [x] Depois que todos marcam "Pronto", o convite é recusado com aviso (teste no game server).
- [x] Em clã x clã, um convidado fora do clã entra normalmente.

## Notas de implementação
- Botão no lobby Ranked, desligado com o meu time cheio ou na contagem (todos prontos). O lobby da Steam leva `by` (conta de quem convidou) → `invitedBy` no `/join` (só sala com formato) → ticket → game server põe no time de quem convidou se houver vaga (`inviterTeam`); na contagem a entrada pelo convite é recusada.
- Convidado sem conta: a página da sala manda ao login com `?next=` e volta; o convite fica guardado na aba por 10 min. Teste no game server em `ranked-lobby.test.ts`.
