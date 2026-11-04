# OG-564 — Tiro na diagonal sai na direção antiga (seta e tiro chegam fora de ordem)

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Bug |
| Prioridade | Must |
| Estimativa | 2 pts |
| Sprint | — (fora de sprint, v2.59.1) |
| Status | Em revisão |
| Dependências | OG-371, OG-372 |
| Issue | [#33](https://github.com/thiagovasconcellos/outgun-web/issues/33) |
| Regras de negócio | D-71, D-72 |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que o tiro saia na direção que apertei junto com ele, principalmente nas diagonais.

## Contexto
- Issue #33 (coiote, Smonk, Nosf, Slim): ~100% de acerto nas direções retas e ~60% nas diagonais, com qualquer tolerância de diagonal (desligada, 1 a 13 ms).
- Causa: o servidor vira a arma na chegada de cada `input` e o `fire` fixa a direção do tiro na chegada dele. No cliente, mudança de seta na segunda metade do frame (≈ metade das vezes) só saía no próximo envio de 10 Hz, mas o `fire` saía na hora: o tiro chegava antes da seta e saía na direção antiga. Na diagonal quase sempre há uma seta nova junto com o tiro; nas retas o jogador já anda para onde atira. A tolerância piorava: durante a janela os controles vão com strafe, e o "vira já" do tiro também ficava para o próximo envio.
- Métricas do beta (2026-11-04): tick saudável (p99 < 2 ms), espera média do input até o tick 41 ms, 35% das mudanças de controle sobrescritas antes do tick.

## Escopo
- `ClientSession.setControls(..., urgent)`: com tiro, a mudança pendente sai na hora, antes do `fire` (mesmo frame do cliente; o histórico da predição fica como estava).
- `host.ts`: tiro apertado com o acorde aberto espera a janela fechar (no máximo a tolerância escolhida), vira a arma e sai; toque mais curto que a janela ainda atira.

## Critérios de aceite
- [x] Seta apertada junto com o tiro, em qualquer momento do frame, chega ao servidor antes do tiro.
- [x] Com tolerância de diagonal, o tiro apertado antes da segunda seta sai na diagonal se ela vier dentro da janela.
- [ ] Jogadores da issue confirmam no beta (PO).

## Notas de implementação
- Com o reenvio "urgente" a predição pode ter uma correção de 1 frame de movimento quando o pacote alcança o tick anterior; preferível ao tiro na direção errada.
- Outros sintomas da issue em cards próprios: OG-565 (power-ups atrasados na sala nova), OG-566 (vultos de mortos), OG-567 (toque de tiro durante a recarga se perde).
