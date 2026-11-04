# OG-563 — Ranked: quem saiu do jogo volta à vaga sem prazo

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Mudança de regra |
| Prioridade | Must |
| Estimativa | 2 pts |
| Sprint | — (fora de sprint, v2.59.1) |
| Status | Em revisão |
| Dependências | OG-262, OG-332 |
| Regras de negócio | RN-RKL-18, D-46, D-92 |
| Skills | `outgun-card-workflow` |

## História
Como jogador que caiu (ou saiu) de um jogo Ranked, quero voltar à minha vaga a qualquer momento do jogo, mesmo depois do prazo de 120 s e mesmo que o time tenha seguido com um a menos.

## Contexto
- Incidente de 2026-11-04 (sala `r-wxp4tprd`, 5x5 md3 "CTF de terça-feira"): master caiu no 2º jogo e não voltou nem pela web nem pelo app da Steam. A API respondia 409 `room_in_game` a cada tentativa (01:45–01:49 UTC); outro jogador (`37ce876d…`) ficou na mesma situação. A sala seguia com 8 humanos e nenhum bot.
- Causa: depois do prazo, o voto "um a menos" (ou o limite de bots) tirava o jogador da sala (`goShort` → `leave`); sem vaga no roster, a API o tratava como alguém de fora. A volta só existia no prazo ou com o bot substituto.

## Escopo
- Game server: `goShort` guarda conta → lado (`away`); a entrada dessa conta com o jogo em andamento é aceita, no mesmo lado, com a contagem de 3 s. A lista zera no fim do jogo (entre jogos a vaga reabre no lobby, D-43), na partida cancelada e no início de outra.
- Heartbeat leva `away` por sala; a API grava (`rooms.away`, migração 0054) e o `POST /rooms/:id/join` trata essas contas como quem volta.

## Critérios de aceite
- [x] Quem saiu com o time seguindo um a menos volta ao mesmo lado a qualquer momento do jogo; outros continuam recusados.
- [x] A API aceita a volta dessas contas com o jogo em andamento.
- [x] v2.59.1 no beta e na branch beta da Steam (build 26431095).

## Notas de implementação
- Quem volta entra como jogador novo (frags do jogo zerados no placar); a marca "Com um a menos" do relatório continua, porque o time jogou desfalcado.
- Expulsos e banidos não entram na lista (a expulsão não passa pelo `goShort`; banidos seguem recusados).
