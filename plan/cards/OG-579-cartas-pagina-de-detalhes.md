# OG-579 — Cartas de Jogador: página de detalhes da carta (só para quem tem)

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S61 |
| Status | Em revisão |
| Dependências | OG-572, OG-576 |
| Regras de negócio | RN-CRT-07, D-94 |
| Skills | `outgun-card-workflow` |

> Origem: proposta "Cartas de Jogador" (https://claude.ai/artifact/4o8tyipW7tQp8yESK5PxAt, cópia em `plan/specs/cartas-de-jogador/proposta.html`) e respostas do PO P1–P20 em 2026-11-05. Decisão D-94.

## História
Como jogador que ganhou a carta, quero ler a história completa da lenda, para conhecer quem marcou o Outgun.

## Contexto
- Página da proposta (`detailPage()`), visão "Tenho a carta".

## Escopo
- Rota `/cartas/:slug`: faixa na cor da classe, carta grande, "Sua cópia" (número e data do resgate), frase dourada, classe/posição/geração, clãs em ordem (último em destaque), história, conquistas, características, habilidades, lembrança, quantos têm, chance por resgate e cartas ligadas (só as que a pessoa tem viram link).
- Sem a carta: a página não mostra nada da ficha, só "Você ainda não descobriu esta carta" (P14). A API não entrega a ficha a quem não tem.
- Sem compartilhar imagem e sem vitrine por enquanto (P15).

## Critérios de aceite
- [x] Quem tem lê a ficha inteira; quem não tem recebe 403 da API e a página vazia.
- [x] Correção feita no painel aparece na página na hora.

## Notas de implementação
- `CardPageScreen` em `/cartas/:slug` e `GET /cards/:slug` (401 sem conta, 403 `not_owned` sem nada da ficha, 404). Cartas ligadas só viram link se a pessoa também tem a carta ligada.
- Gerações chegam com nome e descrição (ex.: "2ª geração · Outgun 1.0"). Sem compartilhar nem vitrine (P15).
