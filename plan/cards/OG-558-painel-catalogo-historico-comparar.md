# OG-558 — Painel: catálogo único, histórico, baixar, comparar e restaurar

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S60 |
| Status | Em revisão |
| Dependências | OG-557 |
| Regras de negócio | RN-MRV-02, RN-MRV-07, RN-MRV-11 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu (arquiteto de mapas da comunidade), 2026-11-02 — cópia em `plan/specs/mapas-revisoes/`. Decisão D-91.

## História
Como moderador, quero ver cada mapa uma vez só, abrir o histórico, baixar o TXT de qualquer revisão, comparar duas revisões e voltar a uma anterior, sem pedir deploy ao PO.

## Escopo
- Catálogo: uma linha por mapa (título atual, autor, origem, revisão ativa, jogável sim/não, rotações em que está); revisões antigas só no Histórico.
- **Baixar TXT** de qualquer revisão (bytes exatos, Latin-1), **só no painel, para moderadores** (P7, comunidade 2026-11-02). Sem botão de download para jogadores; o texto que o cliente baixa para jogar/assistir continua servido como hoje.
- **Comparar** antes de publicar e no histórico: duas miniaturas lado a lado (renderizador do `MapPreview`) e resumo do que mudou (paredes, chão, bandeiras, spawns, bases trocadas).
- **Restaurar** = publicar uma revisão antiga como nova revisão ativa (intermediárias ficam).
- **Desativar/ativar para novas partidas**, igual para nativos e da moderação; desativar não apaga nada e continua recusado se o mapa estiver numa rotação (regra atual do painel).

## Critérios de aceite
- [x] Restaurar a revisão 1 do Larhi cria a revisão 3 com os bytes da 1.
- [x] Mapa desativado some das escolhas de sala/rotação e continua tocando nos replays.
- [x] Comparação de Attack nativo × revisão aponta "bases trocadas".

## Notas de implementação
- Catálogo: uma linha por mapa (título, chave, autor, origem, revisão ativa/total, jogável, rotações). Histórico em diálogo (`admin-map-history.tsx`): baixar TXT (`GET /admin/maps/:key/revisions/N.txt`, só moderador), comparar duas revisões (miniaturas + resumo de paredes, círculos, chão, bandeiras, spawns, bases trocadas) e restaurar.
- Restaurar **reativa** a revisão antiga (não cria cópia: o SHA-256 é único por mapa, então os mesmos bytes não viram outra revisão); as intermediárias ficam e o conflito do OG-557 passa a comparar com a ativa.
- `PUT /admin/maps/:key/playable` vale para nativos também; desativar segue recusado com o mapa numa rotação.
