# OG-544 — Predição: saltos de ~50 px com 150 ms de RTT e 2% de perda

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Bug |
| Prioridade | Could |
| Estimativa | 3 pts |
| Sprint | — |
| Status | Backlog |
| Dependências | OG-064, OG-543 |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador com conexão ruim (150 ms e alguma perda), quero que os outros bonecos não deem saltos na tela quando um pacote se perde.

## Contexto
- Achado no fechamento da S58: o teste `prediction.test.ts` (150 ms de RTT, 20 ms de jitter, 2% de perda, 4 jogadores, 60 s) pede zero saltos, mas só passava pela semente escolhida. Em 10 sementes, sem mudança nenhuma da S58, 4 têm 1–2 saltos de 45–72 px (`worstJump`); com o envio periódico de tiros do OG-543 (um pacote a mais a cada 2 s, que muda quais pacotes se perdem no link simulado), 5 de 10.
- O teste passou para a semente 6 (limpa nas duas versões). O comportamento de fundo é anterior à S58.

## Escopo
- Rodar o teste em várias sementes, achar o caso do salto (perda de qual mensagem, extrapolação ou correção) e corrigir na predição (`packages/netcode`).
- Deixar o teste de saltos varrendo algumas sementes.

## Critérios de aceite
- [ ] Zero saltos acima de 8 px em 10 sementes com 150 ms e 2% de perda (teste).

## Notas de implementação
(preenchido durante a execução)
