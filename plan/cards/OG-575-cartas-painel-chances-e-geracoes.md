# OG-575 — Cartas de Jogador: painel — chances por classe e cadastro de gerações

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Should |
| Estimativa | 2 pts |
| Sprint | S61 |
| Status | Concluído |
| Dependências | OG-571, OG-573 |
| Regras de negócio | RN-CRT-03, RN-CRT-05, D-94 |
| Skills | `outgun-card-workflow` |

> Origem: proposta "Cartas de Jogador" (https://claude.ai/artifact/4o8tyipW7tQp8yESK5PxAt, cópia em `plan/specs/cartas-de-jogador/proposta.html`) e respostas do PO P1–P20 em 2026-11-05. Decisão D-94.

## História
Como moderador/admin, quero ajustar as chances de cada classe e manter as gerações, para equilibrar a coleção sem deploy.

## Contexto
- Simulador de chances da proposta (seção Drops) como referência da tela.

## Escopo
- Chances: peso por classe (moderador e admin, P2), com a porcentagem resultante e a chance de cada carta (peso ÷ soma ÷ cartas ativas da classe); aviso de classe com chance e sem carta ativa; simulação "quantas semanas para completar" para o jogador médio.
- Gerações (só admin, P10): criar, renomear, reordenar e desativar; geração em uso não se apaga.
- Tudo vai para a auditoria.

## Critérios de aceite
- [x] Mudar um peso altera a chance mostrada e vale no próximo resgate.
- [x] Moderador não vê o cadastro de gerações; admin vê.

## Notas de implementação
- `OddsAndGenerations` em `admin-cards.tsx`: pesos por classe com % por resgate, chance de cada carta e aviso de classe com peso sem carta ativa. A "simulação" virou conta exata: sem repetidas e 2 resgates por semana, a coleção fecha em ⌈cartas ÷ 2⌉ semanas para quem resgata toda semana.
- Gerações: tabela para todos, edição e criação só para admin (a API também recusa).
