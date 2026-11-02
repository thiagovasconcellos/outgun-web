# OG-546 — Salas fixas da plataforma por região

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S59 |
| Status | Em revisão |
| Dependências | OG-545 |
| Regras de negócio | RN-REG-03 |
| Skills | `outgun-card-workflow` |

## História
Como jogador europeu, quero ver as salas fixas do Outgun também no servidor de Madrid, para ter sempre onde jogar perto de mim, como no Brasil.

## Contexto
- As salas fixas (`rooms.persistent`, criadas no `apps/api/src/db/seed.ts`) são uma lista única: a sala abre no servidor de quem entra primeiro, então "Casual 1" abriria ora em SP, ora em Madrid.

## Escopo
- Sala fixa ganha a região (`rooms.region`, migração nova). As atuais ficam em `br`.
- Cada região com servidor oficial tem seu conjunto de salas fixas (mesmos presets e nomes, com a região no nome ou na bandeira). O painel admin cria/remove salas fixas por região.
- `placeRoom` só abre sala fixa num servidor da região dela. Sem servidor da região no ar, a sala não aparece na lista.
- A lista de salas mostra todas as regiões, ordenadas pelo ping (região mais próxima primeiro).
- Salas da OutCup e do Ranked seguem a região de quem cria (OG-545); a OutCup fica em `br` até decisão do PO.

## Critérios de aceite
- [x] Com `br` e `es` no ar, a lista mostra as salas fixas das duas regiões, a mais próxima primeiro.
- [x] Sala fixa de `es` nunca abre em `br` (e vice-versa).
- [x] Desligar o servidor `es` tira as salas fixas de `es` da lista em até 10 s.

## Notas de implementação
- Achado: todo game server criava a sala fixa `main`; dois servidores trocariam a sala de dono a cada heartbeat. Agora o id vem de `MAIN_ROOM` (padrão `main`; Madrid usa `main-es`, OG-548) e a API ignora (com log `room_id_conflict`) sala no ar com o mesmo id em outro servidor.
- `rooms.region` (migração 0051) é gravada só quando o próprio servidor cria a sala: a `main` de cada servidor fica presa à região dele; as da plataforma no banco (`main` do seed, `ranked`) seguem sem região e abrem onde quem entra estiver.
- Salas fixas por região vêm de cada servidor (`MAIN_ROOM`/`ROOMS`); não fiz tela de salas fixas por região no painel (não havia cadastro de salas fixas no painel).
- Lista: região mais próxima primeiro (`nearestFirst`); lotadas continuam no fim.
