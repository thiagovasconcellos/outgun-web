# OG-577 — Cartas de Jogador: tela de resgate e abertura com efeito por classe

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S61 |
| Status | Em revisão |
| Dependências | OG-572, OG-576 |
| Regras de negócio | RN-CRT-01, RN-CRT-04, D-94 |
| Skills | `outgun-card-workflow` |

> Origem: proposta "Cartas de Jogador" (https://claude.ai/artifact/4o8tyipW7tQp8yESK5PxAt, cópia em `plan/specs/cartas-de-jogador/proposta.html`) e respostas do PO P1–P20 em 2026-11-05. Decisão D-94.

## História
Como jogador, quero abrir a carta com suspense que cresce com a raridade, para o resgate ser um momento.

## Contexto
- Abertura da proposta (`openPack()`): verso que brilha na cor da classe por mais tempo quanto mais rara, clarão a partir do Lendário, tremor no Especial e na Mítica, tela que escurece no Nefasto.

## Escopo
- Ponto de entrada na tela inicial e no perfil: "Resgatar carta (2 disponíveis)", ou o progresso "1 de 3 partidas nesta semana".
- Abertura: verso → suspense por classe → frente; "Ver a página da carta" e "Resgatar a próxima".
- Se a carta é a do próprio jogador (cópia nº 0), a abertura mostra a recompensa da lenda (OG-580).
- Reduzir movimento: vira sem efeitos.

## Critérios de aceite
- [x] O resgate é sorteado no servidor antes da animação; recarregar a página não troca a carta.
- [x] Os 6 efeitos batem com a proposta.

## Notas de implementação
- `screens/cards.tsx` → `ClaimScreen` em `/cartas/resgatar`: verso que carrega na cor da classe (0,2 s a 1,8 s), vira, clarão a partir do Lendário, escurecido no Nefasto, tremor no Especial e na Mítica (`cards.css`); sem efeitos com movimento reduzido. Entrada na tela inicial (linha "Cartas de jogador" na ficha de quem entrou: "Resgatar (2)", "1 de 3 partidas" ou "12/85") e no perfil.
- Aviso `cards` com texto e link para o resgate. Conferido com a API simulada (Playwright); com banco real, no fechamento.
