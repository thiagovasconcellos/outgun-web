# OG-580 — Cartas de Jogador: recompensa da lenda que tira a própria carta (broche, destaque e marco)

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Should |
| Estimativa | 3 pts |
| Sprint | S61 |
| Status | Em revisão |
| Dependências | OG-576, OG-578 |
| Regras de negócio | RN-CRT-09, D-94 |
| Skills | `outgun-card-workflow` |

> Origem: proposta "Cartas de Jogador" (https://claude.ai/artifact/4o8tyipW7tQp8yESK5PxAt, cópia em `plan/specs/cartas-de-jogador/proposta.html`) e respostas do PO P1–P20 em 2026-11-05. Decisão D-94.

## História
Como jogador que virou carta, quero ser reconhecido quando tiro a minha própria carta, para mostrar que a lenda ainda joga.

## Contexto
- P13: o PO pediu ajuda para definir a recompensa; abaixo está a proposta do agente, a confirmar na revisão.
- Marcos em `apps/api/src/milestones.ts` (conquistas da Steam espelham marcos, D-77).

## Escopo
- **Broche "Lenda"** ao lado do nick no portal (perfil, listas de jogadores, ranking, lobby e lista das salas), na cor da classe da carta, com a dica "Lenda do Outgun: SLAN, Especial". Fora do HUD da partida (RN-UI-05).
- **Destaque no perfil:** a própria carta, grande, no topo da coleção, com "Cópia nº 0".
- **Marco "A lenda em pessoa"** (e a conquista da Steam pelo espelho dos marcos).
- A recompensa vem no resgate que sorteia a própria carta (sem entrega manual, P20); a conta precisa estar vinculada à carta no painel antes.
- Se a moderação desvincular a conta, o broche sai; a cópia nº 0 fica.

## Critérios de aceite
- [x] Conta vinculada que tira a própria carta recebe a cópia nº 0, o broche e o marco.
- [x] O broche não aparece dentro da partida.

## Notas de implementação
- Broche: `GET /cards/legends` (contas com a própria carta na cópia nº 0) + `ui/LegendBadge.tsx`, dentro do `PlayerLink` (perfil, jogadores, ranking, relatórios, clãs) e no título do perfil; uma chamada por carregamento. Nada no HUD da partida.
- Marco `card_legend` ("A lenda em pessoa", grupo social, ícone estrela) gravado no resgate da própria carta, com aviso; conquista `CARD_LEGEND` gerada nos CSVs/ícones da Steam — **o PO precisa cadastrá-la no Steamworks** (como as outras, `apps/desktop/steam/achievements.md`).
