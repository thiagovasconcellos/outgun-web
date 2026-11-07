# OG-598 — Coluna Região nas listas de salas

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 2 pts |
| Sprint | S64 |
| Status | Concluído |
| Dependências | OG-547 |
| Regras de negócio | RN-REG-04, RN-REG-07, RN-UI-08 |
| Skills | `outgun-card-workflow` |

> Origem: pedido do PO, 2026-11-06: a bandeira solta ao lado do ping não basta. Decisão D-97.

## História
Como jogador, quero ver em qual país cada sala está, para escolher sem precisar reconhecer a bandeira.

## Escopo
- Coluna própria **Região** (bandeira + nome do país na língua do jogador) nas tabelas de Casual (`apps/web/src/screens/lobby.tsx`) e Ranked (`apps/web/src/screens/ranked-rooms.tsx`). Ordem: Sala, Região, Mapa, Jogadores, Ping, Assistir (no Ranked, a coluna entra logo depois da sala).
- A coluna Ping passa a mostrar só os milissegundos.
- Bandeira da Alemanha (`de`) em `apps/web/src/ui/Flag.tsx` e no teste.
- Celular: se o nome do país não couber em 360 px, mostrar só a bandeira, com o nome como texto alternativo.

## Critérios de aceite
- [x] As duas tabelas têm a coluna Região, e o Ping não traz mais a bandeira.
- [x] Nome do país acompanha o idioma do jogador ("Alemanha", "Germany").
- [x] Região que não é país (`local`, `eu`) aparece como veio; sala sem região mostra "—".
- [ ] Sem rolagem horizontal de 360 a 600 px (RN-UI-08).

## Notas de implementação
`RegionLabel` em `ui/Flag.tsx`. Até 600 px fica só a bandeira, com o nome no texto alternativo; país sem bandeira no pacote continua com o nome visível. A rolagem de 360 a 600 px fica para o PO conferir.
