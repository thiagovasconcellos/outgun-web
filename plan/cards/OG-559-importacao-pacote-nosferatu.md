# OG-559 — Importação do pacote de Nosferatu (14 revisões + 9 mapas novos)

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Infra |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S60 |
| Status | Pronto |
| Dependências | OG-552, OG-557 |
| Regras de negócio | RN-MRV-09 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu (arquiteto de mapas da comunidade), 2026-11-02 — cópia em `plan/specs/mapas-revisoes/`. Decisão D-91.

## História
Como comunidade, queremos as 23 versões revisadas por Nosferatu no ar de uma vez, com os originais guardados.

## Contexto
- Pacote: `mapas_revisados.zip` (23 TXT) + `inventario_mapas.csv` (vínculos). SHA-256 conferidos em 2026-11-02. Todos passam no parser.
- Conferência de conteúdo (feita na análise, ver o artifact): só o Ipiranga é mudança de texto; Cebs Park mantém as paredes e troca as bases; Attack, Fabiana Cecin e Larhi trocam as bases e mudam paredes; Larhi troca 48 círculos por retângulos e ganha spawn; 3x3, Mooca, Pari, Pari 2, Sisso, The Blunt Mini e The Cover 4 passam a um spawn por time; Verde troca o spawn central pelo da bandeira de cada time. Títulos mudam em `2 versus 2 (Duel)` → `2 versus 2`, `3x3 (Duel)` → `3x3`, `Pari2` → `Pari 2`. Autoria muda em Attack (`evilKaioh & Devil` → `evilKaioh`) e Cebs Park (`Outgun & Nosferatu` → `Outgun`), conforme o pacote; a autoria da revisão 1 fica preservada.

## Escopo
- `tools/dev/map-import.mjs` lendo o CSV: `--dry-run` (relatório de vínculos, colisões, títulos/autores que mudam, resumo geométrico por par), execução numa transação, idempotente (SHA-256 já existente = nada a fazer), procedência `import:nosferatu-2026-11`, publicador = **conta de admin do Nosferatu, usuário `Nosf`** (exatamente assim; PO, 2026-11-02): `--publisher Nosf`, recusado se a conta não for admin/moderador.
- 14 revisões ligadas pela chave legada explícita do CSV (nunca por título); 9 mapas novos com identidade própria; os 6 nativos sem revisão ficam como estão.
- Rotações apontam para a família, então os 14 revisados entram sozinhos onde o nativo já estava, **Casual e Ranked de uma vez** (P4, comunidade 2026-11-02).
- Os 9 novos entram na **rotação Casual** já na S60 (P3); no Ranked não entram (só por decisão de moderador depois). Se o painel não tiver rotação Casual gravada (`map_rotations` sem linha = a do servidor), a importação cria a linha com a rotação atual + os 9.
- Conciliação das duplicatas do OG-560 no mesmo script e na mesma transação, antes de publicar a revisão de Nosferatu (que fica ativa).
- `gavea.txt` convertido de UTF-8 para Latin-1 (título "Gávea").

## Critérios de aceite
- [ ] `--dry-run` em cópia do banco lista 14 vínculos, 9 novos, 6 intocados e 0 colisões não resolvidas.
- [ ] Segunda execução não cria nada.
- [ ] Nova partida em Larhi usa os cantos retos e o nome continua "Larhi".
- [ ] Os 9 novos aparecem na rotação Casual e em nenhuma rotação Ranked.

## Notas de implementação
