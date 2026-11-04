# OG-567 — Toque rápido de tiro durante a recarga se perde

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Melhoria |
| Prioridade | Should |
| Estimativa | 2 pts |
| Sprint | — |
| Status | Backlog |
| Dependências | — |
| Issue | [#33](https://github.com/thiagovasconcellos/outgun-web/issues/33) |
| Regras de negócio | D-74 |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que o toque no tiro não se perca quando ainda falta pouco para a arma recarregar.

## Contexto
- Relato de Smonk na issue #33: "aperta para atirar e não atira".
- Hoje (como no original): toque rápido (apertar e soltar antes do tick) vira `attackOnce`; se a arma ainda está no intervalo entre tiros (`nextShootFrame`), o toque é descartado no mesmo frame (`postPhysics`). Com 10 Hz e intervalo curto, o toque logo antes do fim da recarga some.
- Proposta: guardar o toque por até 1 a 2 frames e atirar assim que a arma liberar. Muda a simulação (`packages/sim`): precisa de decisão do PO (D-74 congela a física; isto é regra de tiro, não física).

## Critérios de aceite
- [ ] Decisão do PO registrada (D-NN).
- [ ] Toque durante o fim da recarga atira no primeiro frame possível; segurar o tiro segue igual.
