# OG-560 — Conciliar duplicatas já existentes (mooca × Mooca, Pari2)

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Chore |
| Prioridade | Should |
| Estimativa | 1 pts |
| Sprint | S60 |
| Status | Pronto |
| Dependências | OG-552 |
| Regras de negócio | RN-MRV-03 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu (arquiteto de mapas da comunidade), 2026-11-02 — cópia em `plan/specs/mapas-revisoes/`. Decisão D-91.

## História
Como moderador, quero que mapas que já entraram duplicados no painel passem a contar como um mapa só, sem perder partidas nem replays.

## Contexto
- **Produção conferida em 2026-11-02 (somente leitura, liberado pelo PO):** o painel tem 3 mapas: `Iron Man` e `purgatory` (do PO, 2 partidas cada, na rotação Casual; não são duplicatas, viram famílias próprias no OG-552) e **`Mooca`**, única duplicata: publicado por `Nosf` em 2026-11-01 (v1) e desativado no mesmo dia (v2), **0 partidas**, em nenhuma rotação. CRC 61560 = o mesmo do `mooca.txt` do pacote (mesma geometria), mas bytes diferentes (551 × 596, o do pacote tem os comentários `Created/Revised`).
- `Pari2` × `Pari 2` não é duplicata no banco: é só o `P title` do nativo `pari2`, que muda com a revisão (P2).

## Escopo
- Relatório somente-leitura no `--dry-run` do OG-559 (repetir a conferência na hora, o painel pode ter mudado).
- `Mooca` vira alias da família `mooca`; o texto dele entra como **rev 2** (publicado por `Nosf`, 2026-11-01); o do pacote vira **rev 3**, ativa.
- **Regra do PO (2026-11-02):** duplicata de um dos 23 mapas do pacote é absorvida pela família existente (o nativo ou o mapa já publicado), nunca vira família nova: o nome duplicado vira alias, as versões dele entram como revisões históricas da família (com data e publicador originais) e partidas/replays passam a apontar para a família. A revisão **ativa** é sempre a de Nosferatu.
- Ordem: rodar junto com o OG-559, no mesmo script e na mesma transação, de modo que a revisão de Nosferatu seja publicada por último e fique ativa. Rotações que citavam o nome duplicado passam a citar a família (sem repetir o mapa).
- Duplicata que não corresponda a nenhum mapa do pacote: só relatório; o PO decide caso a caso. Nada é apagado.
- Executar antes do OG-556 contar marcos.

## Critérios de aceite
- [ ] Depois da conciliação, `mooca`/`Mooca` contam como um mapa nos filtros e marcos; partidas e replays dos dois continuam abrindo.
- [ ] A revisão ativa de cada família conciliada é a de Nosferatu; as versões duplicadas aparecem no histórico.

## Notas de implementação
