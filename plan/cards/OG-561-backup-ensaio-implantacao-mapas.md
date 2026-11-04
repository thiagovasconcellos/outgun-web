# OG-561 — Backup, ensaio da migração e implantação recuperável dos mapas

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Infra |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S60 |
| Status | Em andamento |
| Dependências | OG-552, OG-553, OG-554, OG-555, OG-559 |
| Regras de negócio | RN-MRV-09 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu (arquiteto de mapas da comunidade), 2026-11-02 — cópia em `plan/specs/mapas-revisoes/`. Decisão D-91.

## História
Como PO, quero subir a mudança de mapas com backup testado e caminho de volta, porque ela mexe em partidas, replays e estatísticas.

## Escopo
- Backup verificável antes: banco (pg_dump + restauração testada numa cópia), replays (`matches.replay_url`), rotações e `panel_maps`.
- Ensaio completo numa cópia do banco de produção: migrações, semente (OG-552), preenchimento (OG-555), importação (OG-559) e conciliação (OG-560) em `--dry-run` e depois de verdade; contagens antes/depois.
- Roteiro de rollback (aplicação e banco) registrado no card.
- Checklist com os 10 testes de aceitação da proposta de Nosferatu (seção 6), marcando o que foi coberto por teste automático e o que o PO confere no beta.
- Deploy no `br` e no satélite.

## Critérios de aceite
- [ ] Restauração do backup testada antes do deploy.
- [ ] Contagens de partidas, participações, ratings e marcos iguais antes/depois.
- [ ] Os 10 testes de aceitação da proposta com resultado registrado.

## Notas de implementação
