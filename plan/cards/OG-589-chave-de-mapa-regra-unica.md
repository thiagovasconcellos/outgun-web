# OG-589 — Regra única de chave de mapa e conflito sem variantes numeradas

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | — |
| Status | Pronto |
| Dependências | OG-552 |
| Regras de negócio | RN-MRV-12, RN-MRV-13 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu, 2026-11-06, com as respostas P1..P10 — página em `plan/specs/nomes-de-mapas/proposta.html`. Decisão D-96.

## História
Como moderador, quero que cada título gere sempre a mesma chave, para que um envio repetido nunca vire outro mapa por engano.

## Contexto
- `newMapKey` (`apps/api/src/map-catalog.ts:286`) preserva maiúsculas e tenta `Gavea 2`, `Gavea 3`; `fileKey` (`map-import.ts:82`) usa o nome do arquivo; `findMap` compara a chave com exatidão e o alias só sem maiúsculas.
- `titleKey` apaga algarismos finais e aproxima Pari de Pari 2: serve só de aviso, nunca de bloqueio.

## Escopo
- Função única em pacote compartilhado, com a regra da RN-MRV-12 (a página da proposta tem a versão de referência e os exemplos).
- Índice único que proteja chaves e aliases normalizados contra envios simultâneos (migração nova).
- `findMap`, `mapFilterSql` e as buscas por `:key` comparam pela forma normalizada, em chaves e aliases.
- `newMapKey` deixa de numerar: chave ocupada (principal, alias ou reservada) é conflito que informa o mapa envolvido.
- Separar a colisão exata da sugestão de parecidos; números oficiais deixam de ser ruído em `titleKey`.
- Chave nunca sai do nome do arquivo; `mapgen_*`, `~rN` e `t4` seguem seus contratos.

## Critérios de aceite
- [ ] `Meu_Mapa`, `meu_mapa`, `meu mapa` e `Meu Mapa` geram `meu_mapa` e a mesma identidade.
- [ ] Exemplos da D-96 passam em teste: `Rocky's` → `rockys`, `Kiss & Rep` → `kiss_rep`, `A+B` → `a_b`, `3x3 (Duel)` → `3x3_duel`, `Bjørn` → `bjorn`, `Straße` → `strasse`, `Gávea` → `gavea`, `Pari 2` → `pari_2`.
- [ ] Reenviar Gávea dá conflito e não cria `Gavea 2`; Pari 2 e Attack 3 não são bloqueados por causa de Pari e Attack.
- [ ] Título reservado (`Random Map`, `Mapgen 12`, `T4`), vazio após normalizar ou com chave acima de 64 caracteres é recusado com mensagem, sem corte silencioso.
- [ ] Dois envios simultâneos do mesmo título criam um único mapa.

## Notas de implementação
