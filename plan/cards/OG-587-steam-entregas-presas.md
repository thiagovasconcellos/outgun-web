# OG-587 — Steam: entrega que esgotou as tentativas volta à fila

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Bug |
| Prioridade | Should |
| Estimativa | 2 pts |
| Sprint | S63 |
| Status | Em revisão |
| Dependências | OG-586 |
| Regras de negócio | RN-CRT-10, D-95 |
| Skills | `outgun-card-workflow` |

> Origem: achado na primeira entrega real do inventário Steam, em 2026-11-06.

## História
Como jogador com a conta Steam ligada, quero receber a carta mesmo que a Steam tenha ficado fora do ar por algumas horas, sem depender de alguém corrigir o banco.

## Contexto
- Depois de 8 tentativas (cerca de 2 horas), a entrega ficava como `failed` para sempre: religar a conta não a devolvia à fila e desligar não a apagava.

## Escopo
- Entrega `failed` descansa 24 h e volta sozinha à fila, com as tentativas zeradas.
- Religar a conta devolve à fila na hora as entregas `failed` dela, já com o SteamID novo.
- `node dist/cli.js cards steam-retry [USUÁRIO]` devolve à fila na hora as de uma conta ou de todas.
- Desligar a conta apaga também as `failed`. Nada é entregue a um SteamID que não está mais ligado à conta.

## Critérios de aceite
- [x] Entrega `failed` não é tentada antes de 24 h e é entregue depois.
- [x] Religar e a CLI devolvem à fila na hora.
- [x] Entrega de SteamID que não é mais o da conta não volta à fila.
- [x] Desligar mantém os itens entregues e apaga o que faltava entregar.

## Notas de implementação
- Sem migração: o descanso usa `next_at` da própria entrega, e o relógio de 30 s devolve as vencidas, então sobrevive a reinícios.
- Falha permanente (por exemplo, carta sem definição publicada no Steamworks) custa 8 tentativas por dia; publicar a definição resolve sozinho em até 24 h, ou na hora com a CLI.
