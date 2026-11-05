# OG-573 — Cartas de Jogador: aba Cartas no painel — catálogo e ficha da carta

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S61 |
| Status | Em revisão |
| Dependências | OG-571, OG-572 |
| Regras de negócio | RN-CRT-02, D-94 |
| Skills | `outgun-card-workflow` |

> Origem: proposta "Cartas de Jogador" (https://claude.ai/artifact/4o8tyipW7tQp8yESK5PxAt, cópia em `plan/specs/cartas-de-jogador/proposta.html`) e respostas do PO P1–P20 em 2026-11-05. Decisão D-94.

## História
Como moderador, quero consultar todas as cartas, ver a ficha e o histórico de cada uma, para manter o catálogo em ordem.

## Contexto
- Tela "Catálogo" e "Ficha" da proposta v3 (seção Telas da moderação), sem a fila de revisão, que caiu (P8).
- Abas em `apps/web/src/screens/AdminScreen.tsx` (`Tab`), padrão `admin-tab` e `Table`.

## Escopo
- Aba **Cartas** no painel (moderador e admin), com subtelas Catálogo, Nova carta, Chances e gerações.
- Catálogo: contadores (ativas, desativadas, por classe com a meta), busca e filtros, tabela (boneco, nick, classe, posição, geração, ficha x/11, donos, última edição e por quem). Clicar abre a ficha.
- Ficha: carta, checklist dos campos, números da coleção (donos, chance por resgate), autor e última edição, fontes, histórico de revisões com diferenças, registro; ações Editar, Desativar/Reativar, Restaurar revisão e Ver página.
- No celular, segue a regra das abas de moderação (D-80): só consulta.

## Critérios de aceite
- [x] Catálogo encontra uma carta pelo nick, clã ou epíteto.
- [x] Desativar pela ficha pede confirmação e aparece na auditoria.

## Notas de implementação
- `apps/web/src/screens/admin-cards.tsx` (aba **Cartas**, entre Bots e OutCup; no celular entra em `PHONE_ADMIN_TABS`, só consulta). Catálogo com contadores por classe (sem "meta": o catálogo não tem tamanho fixo), filtros e tabela; ficha com carta, checklist, donos, chance por resgate, fatos, frase, biografia, revisões com diferença campo a campo e Restaurar.
- Desativar pede confirmação na própria ficha (sem diálogo do navegador). A conferência visual com dados fica para o fechamento (precisa de API e banco).
