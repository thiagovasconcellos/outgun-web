# OG-570 — Cartas de Jogador: modelo de dados, catálogo compartilhado e gerações

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | S61 |
| Status | Pronto |
| Dependências | — |
| Regras de negócio | RN-CRT-01, RN-CRT-02, RN-CRT-03, RN-CRT-05, D-94 |
| Skills | `outgun-card-workflow` |

> Origem: proposta "Cartas de Jogador" (https://claude.ai/artifact/4o8tyipW7tQp8yESK5PxAt, cópia em `plan/specs/cartas-de-jogador/proposta.html`) e respostas do PO P1–P20 em 2026-11-05. Decisão D-94.

## História
Como desenvolvedor, quero as tabelas e as definições das cartas num lugar só, para que painel, resgate, inventário e página usem as mesmas regras.

## Contexto
- Migrações em `apps/api/migrations/` (próxima: `0058_*`); migração nunca se edita, mudança de schema é migração nova.
- Cores: `CLAN_COLORS` (anel) e as 32 cores pessoais `player01..player32` (centro) em `packages/protocol/src/colors.ts`.
- Rascunho das tabelas na seção "Banco de dados" da proposta (ajustado pelas respostas: sem aval, sem revisão por outro moderador, sem drops agendados).

## Escopo
- Migração nova com: `legend_cards` (id, slug único, nick, epíteto, posição, biografia, classe, frase dourada, lembrança, cor do anel, cor do centro, conta vinculada opcional, `active`, criado/alterado por e quando), `legend_card_entries` (conquista, característica ou habilidade: ordem, ícone, título, texto), `legend_card_clans` (ordem, texto livre), `legend_card_links` (cartas ligadas: outra carta ou nick), `legend_card_revisions` (cópia jsonb da ficha a cada gravação, autor, data), `card_generations` (id, ordem, nome, descrição; admin edita) e `legend_card_generations` (n:n), `card_class_odds` (peso por classe), `user_cards` (conta, carta, número da cópia, data, resgate de origem; único por conta+carta) e `card_claims` (conta, semana, sequência 1..2, carta sorteada, data).
- Semente: 4 gerações (1ª Outgun 0.5; 2ª Outgun 1.0; 3ª Outgun hospedado por jogadores; 4ª Outgun Web) e os pesos iniciais por classe (Clássico 50, Épico 25, Lendário 13, Especial 8, Nefasto 3,5, Mítica 0,5).
- Definições compartilhadas (cliente e API) em `packages/protocol`: as 6 classes na ordem de raridade (id, nome, cores, degrau 0..5), a lista fechada de ícones, limites (biografia 3000, até 8 itens por lista, título 28, texto 160, frase 90, nick 16) e validação da ficha.
- Número da cópia: sequência por carta a partir de 1; o 0 fica reservado para a conta vinculada (RN-CRT-06).

## Critérios de aceite
- [ ] Migração sobe e desce limpa em banco vazio e no banco do beta (cópia).
- [ ] Validação compartilhada recusa ficha sem nick, classe, cores, biografia ou frase dourada, e cores fora das paletas.
- [ ] Testes da validação e da migração (`migrate.test.ts`).

## Notas técnicas
As fichas ficam só no banco: nada de conteúdo das 85 cartas no repositório público (RN-CRT-08).

## Notas de implementação
(preenchido durante a execução)
