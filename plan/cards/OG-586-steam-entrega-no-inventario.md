# OG-586 — Steam: entrega das cartas no inventário (no resgate, retroativo e nova tentativa)

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S62 |
| Status | Pronto |
| Dependências | OG-584, OG-585, OG-576 |
| Regras de negócio | RN-CRT-10, D-95 |
| Skills | `outgun-card-workflow` |

> Origem: pedido do PO em 2026-11-05 (cartas também no inventário da Steam, só a imagem, sem texto). Decisão D-95.

## História
Como jogador com a conta ligada, quero que cada carta resgatada apareça no meu inventário Steam.

## Contexto
- `IInventoryService/AddItem` (Web API de publicador) cria o item na conta Steam.

## Escopo
- Tabela `card_steam_grants` (conta, carta, situação, tentativas, item da Steam, datas): uma entrega por conta e carta.
- No resgate (`claimCard`) de quem tem Steam ligada, a entrega entra na fila; ao ligar a conta, entram todas as cartas que a pessoa já tem (retroativo).
- Um laço na API entrega a fila (`AddItem` com `notify`), com nova tentativa e espera crescente; falha não afeta o resgate. Carta fora da Steam não é entregue.
- Perfil (dono): "Na Steam: 12 de 14"; painel da carta: quantas entregues.

## Critérios de aceite
- [ ] Resgatar com a Steam ligada entrega o item; ligar a conta depois entrega as que já tinha.
- [ ] Erro da Steam deixa a entrega pendente e tenta de novo.

## Notas de implementação
(preenchido durante a execução)
