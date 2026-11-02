# OG-546 — Salas fixas da plataforma por região

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S59 |
| Status | Pronto |
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
- [ ] Com `br` e `es` no ar, a lista mostra as salas fixas das duas regiões, a mais próxima primeiro.
- [ ] Sala fixa de `es` nunca abre em `br` (e vice-versa).
- [ ] Desligar o servidor `es` tira as salas fixas de `es` da lista em até 10 s.

## Notas de implementação
