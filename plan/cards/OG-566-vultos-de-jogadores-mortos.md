# OG-566 — "Vultos" de jogadores mortos durante a partida

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Bug |
| Prioridade | Should |
| Estimativa | 2 pts |
| Sprint | — |
| Status | Backlog |
| Dependências | — |
| Issue | [#33](https://github.com/thiagovasconcellos/outgun-web/issues/33) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, não quero ver o boneco de quem já morreu andando ou parado na tela.

## Contexto
- Relato de Slim na issue #33: "ficam aparecendo vultos de mortos?".
- Hipóteses: o cliente continua extrapolando o outro jogador até chegar o frame com a morte; ou o boneco volta a aparecer entre a morte e o renascimento por um frame com `dead` desatualizado. Precisa de replay ou captura do momento (pedir ao Slim a partida e o horário).

## Critérios de aceite
- [ ] Causa identificada num replay ou reprodução com `?lag=`.
- [ ] Morto some (ou vira o cadáver do tema) no frame da morte, sem vulto.
