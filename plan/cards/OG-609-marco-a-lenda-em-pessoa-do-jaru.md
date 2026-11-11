# OG-609 — Marco "A lenda em pessoa" ausente em quem tem a própria carta (jaru)

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Bug |
| Prioridade | Should |
| Estimativa | 2 pts |
| Sprint | S65 |
| Status | Pronto |
| Dependências | OG-580 |
| Issue | — (pedido do PO em 2026-11-11) |
| Regras de negócio | RN-CRT-09 |
| Skills | `outgun-card-workflow` |

## História
Como jogador com carta própria (lenda), quero ter o marco "A lenda em pessoa" no perfil, para que a recompensa da lenda venha completa.

## Contexto
- A conta `jaru` tem a própria carta (https://outgunweb.com.br/cartas/jarule) mas o perfil (https://outgunweb.com.br/players/jaru) não mostra o marco `card_legend` ("A lenda em pessoa").
- O único ponto que dá o marco é `apps/api/src/legend-card-claims.ts:169-175`: no resgate em que sai a cópia nº 0 (`own`) faz `INSERT INTO player_milestones … 'card_legend' ON CONFLICT DO NOTHING`. Não há concessão retroativa nem outro caminho que grave a carta nº 0.
- Hipóteses, da mais à menos provável: (1) a carta saiu antes de a recompensa (OG-580) estar no ar, ou por outro caminho (script/ajuste manual) que não passou por esse código; (2) a linha foi apagada por alguma recomputação de marcos (`milestones.ts`, `cli.ts milestones`); (3) a carta nº 0 está ligada a outra conta/cópia que não `own`.

## Escopo
- Diagnóstico no banco do beta (somente leitura): `user_cards` do `jaru` (serial, `claimed_at`), `card_claims`, `player_milestones` (todos os marcos, `card_legend` ausente?) e a data do deploy do OG-580; ver se algum comando de marcos (`cli.ts`) apaga ou reescreve linhas.
- Correção da causa encontrada, com teste (inclusive o caso de quem tirou a carta nº 0 antes do marco).
- Concessão retroativa, idempotente, para toda conta com `user_cards.serial = 0` sem `card_legend` (migração nova ou comando do CLI, nunca editar migração antiga), com a notificação `milestone` uma vez só.
- Conferir também o broche "Lenda" ao lado do nick (`/cards/legends`) e o destaque da carta no perfil dessas contas.

## Critérios de aceite
- [ ] Causa explicada nas notas do card.
- [ ] Teste: conta com cópia nº 0 sem o marco passa a ter `card_legend` depois da concessão; rodar duas vezes não duplica nem renotifica.
- [ ] `jaru` aparece com o marco no perfil depois do deploy; lista de contas afetadas nas notas.
- [ ] PO confere.

## Notas de implementação
(preenchido durante a execução)
