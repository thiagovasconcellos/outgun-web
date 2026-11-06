# OG-594 — Migração das 13 chaves com ensaio, aliases e rotações

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | — |
| Status | Pronto |
| Dependências | OG-593, OG-561 |
| Regras de negócio | RN-MRV-09, RN-MRV-12 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu, 2026-11-06, com as respostas P1..P10 — página em `plan/specs/nomes-de-mapas/proposta.html`. Decisão D-96.

## História
Como PO, quero trocar as chaves numa operação única e conferida, sem editar mapa por mapa.

## Contexto
- Produção em 2026-11-06: 31 mapas; mudam 13: `2 versus 2 (duel)`, `3x3 (duel)`, `attack3`, `cebs park`, `fabiana cecin`, `outgun1`, `pari2`, `the blunt mini`, `the cover 4`, `Iron Man`, `attack 2`, `the small ud`, `the ud`.
- `attack3` → `attack_3` e `outgun1` → `the_blunt` são exceções explícitas à regra (tabela da proposta). A revisão 1 de Attack3 continua intacta; o título Attack 3 só entra com o TXT revisado de Nosferatu, sem mapa novo.
- As 5 rotações salvas contêm chaves que mudam: Casual 13, 2x2 3, 3x3 2, 4x4 3, 5x5 3. `game_servers.rotations` e `ROTATION` no `.env` também têm as antigas.
- Só precisa entrar em produção depois de o OG-593 já estar no ar.

## Escopo
- Script com `--dry-run`: `map_id`, chave antiga e nova, aliases, referências afetadas e colisões, a partir do inventário real do dia.
- Transação única com trava: chave de cada `maps.id`, alias da antiga, rotações na mesma ordem e `version` + 1. Idempotente.
- Ensaio numa cópia do banco, partindo de `deploy/vps/map-rehearsal.sh`, e backup testado antes (RN-MRV-09).
- Atualizar `ROTATION` no `.env`, o padrão em `main.ts` e as referências fixas restantes depois de a troca estar confirmada.
- Plano de reversão escrito. Janela fora de OutCup e sem série Ranked em andamento.

## Critérios de aceite
- [ ] Os mesmos IDs, número de revisões, autores, bytes, CRC e `playable` antes e depois.
- [ ] Todas as chaves seguem `^[a-z0-9]+(?:_[a-z0-9]+)*$`, sem conflitos; rodar de novo não muda nada.
- [ ] `outgun1` resolve para `the_blunt` e `pari2` para `pari_2`; The Blunt ≠ The Blunt Mini, Pari ≠ Pari 2, Attack ≠ Attack 2 ≠ Attack 3.
- [ ] Rotações com os mesmos mapas e a mesma ordem; `matches.map` e TXT intactos; reiniciar não recria nada.
- [ ] Relatório do dry-run aprovado pelo PO antes de gravar em produção.

## Notas de implementação
