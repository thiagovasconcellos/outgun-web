# OG-588 — Imagens das cartas geradas de antemão na API

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Melhoria |
| Prioridade | Should |
| Estimativa | 2 pts |
| Sprint | S63 |
| Status | Em revisão |
| Dependências | OG-583 |
| Regras de negócio | D-95 |
| Skills | `outgun-card-workflow` |

> Origem: investigação da miniatura da SPY quebrada no cliente da Steam, em 2026-11-06. A causa foi atribuída ao cliente da Steam (no site a imagem aparece); este card trata da lentidão encontrada no caminho.

## História
Como jogador, quero que a API não trave quando alguém pede a imagem de uma carta pela primeira vez.

## Contexto
- A imagem era desenhada no primeiro pedido, travando a API por cerca de 0,4 s (1,09 s na primeira depois de subir), e o cache se perdia a cada recriação do container.

## Escopo
- Cache das imagens num módulo próprio, usado pela rota `GET /cards/:slug.png`.
- Depois de subir, e a cada hora, a API gera as imagens que faltam das cartas ativas, com pausa de 0,5 s entre uma e outra.

## Critérios de aceite
- [x] As imagens das cartas ativas ficam prontas sem nenhum pedido.
- [x] Uma imagem já gerada não é desenhada de novo; uma revisão nova é.
- [x] Carta inativa não é gerada de antemão.

## Notas de implementação
- Sem worker: a geração continua na thread principal da API, uma carta por vez com pausa. Nos primeiros 1 a 2 minutos depois de subir, os pedidos podem esperar até cerca de 0,4 s; vale medir em produção e só então avaliar um worker.
- Carta nova ou editada é gerada na rodada seguinte, em até 1 hora, ou no primeiro pedido.
