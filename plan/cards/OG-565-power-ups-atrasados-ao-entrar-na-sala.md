# OG-565 — Power-ups aparecem atrasados ao entrar numa sala do mapa

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Bug |
| Prioridade | Should |
| Estimativa | 3 pts |
| Sprint | — |
| Status | Backlog |
| Dependências | OG-460 |
| Issue | [#33](https://github.com/thiagovasconcellos/outgun-web/issues/33) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero ver os power-ups ("frigideiras") da sala assim que entro nela.

## Contexto
- Relato de Nosf na issue #33: "as frigideiras aparecendo 1s depois de eu entrar na sala".
- Causa provável: o servidor só manda os power-ups da sala nova (`screenChanged` → `powerupVisible`) quando o boneco **no servidor** troca de sala; com a predição, o cliente desenha o jogador na sala nova uma latência + até um tick antes, e a mensagem só volta com o frame seguinte (≈ RTT + 100 a 200 ms).

## Escopo (proposta)
- Medir o atraso real (entrada desenhada → `powerupVisible`) com o `?lag=` do cliente.
- Opção A: mandar também os power-ups das salas vizinhas (o cliente só desenha os da sala atual; custo: informação a mais para um cliente adulterado). Opção B: manter, só reduzir o atraso do envio. Decisão do PO.

## Critérios de aceite
- [ ] Power-ups da sala nova aparecem junto com a entrada desenhada (ou com atraso medido e aceito pelo PO).
