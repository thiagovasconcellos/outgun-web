# OG-572 — Cartas de Jogador: componente da carta com a escada de exclusividade

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | S61 |
| Status | Pronto |
| Dependências | OG-570 |
| Regras de negócio | RN-CRT-01, RN-CRT-06, D-94 |
| Skills | `outgun-card-workflow` |

> Origem: proposta "Cartas de Jogador" (https://claude.ai/artifact/4o8tyipW7tQp8yESK5PxAt, cópia em `plan/specs/cartas-de-jogador/proposta.html`) e respostas do PO P1–P20 em 2026-11-05. Decisão D-94.

## História
Como jogador, quero que cada classe de carta pareça mais exclusiva que a anterior, além da cor, para sentir a raridade só de olhar.

## Contexto
- Referência visual e de código: escada da proposta (`card()`, `frameSvg()`, `drawArt()`, `paint()`), aprovada pelo PO (P1).
- Design system v2 em `apps/web/src/ui/`; as fontes da carta seguem o tema da proposta, dentro dos tokens.

## Escopo
- Componente `PlayerCard` (frente e verso) com boneco em pixels (anel = cor de clã, centro = cor pessoal), nick ajustado à largura e classe com estrelas.
- Degraus por classe: estrelas 1 a 6, moldura (simples → tripla com joias), fundo (escuro → raios, anéis e aura), nome (cor lisa → holográfico), reflexo que segue o mouse a partir do Lendário, moldura que pulsa a partir do Especial, efeitos próprios do Nefasto (rachaduras, falha no nome, fumaça).
- Número da cópia a partir do Lendário (Nº 0042; Nº 0 para a lenda).
- Variante silhueta (para a abertura) e tamanhos pequeno (grade do inventário) e grande (página).
- Movimento desligado com "reduzir movimento" do sistema; numa grade, só a carta sob o mouse anima.
- Página de desenvolvimento (`DevUiScreen`) com as 6 classes lado a lado.

## Critérios de aceite
- [ ] As 6 classes batem com a escada da proposta.
- [ ] Sem animação com `prefers-reduced-motion`.
- [ ] Uma grade de 60 cartas rola sem travar no computador do beta.

## Notas de implementação
(preenchido durante a execução)
