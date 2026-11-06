# OG-590 — Painel: conflito explícito e avisos de título no envio

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | — |
| Status | Pronto |
| Dependências | OG-589, OG-557 |
| Regras de negócio | RN-MRV-13, RN-MRV-14, RN-MRV-15 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu, 2026-11-06, com as respostas P1..P10 — página em `plan/specs/nomes-de-mapas/proposta.html`. Decisão D-96.

## História
Como moderador, quero entender no envio o que está em conflito e o efeito de mudar um título, para decidir sem criar duplicata nem reescrever o histórico sem querer.

## Contexto
- O painel hoje só sugere possíveis duplicatas no `/admin/maps/check` (`routes/admin.ts:382`).

## Escopo
- Conflito de mapa novo mostra o mapa existente e duas saídas: enviar nova revisão ou corrigir o `P title` no TXT. Sem campo de chave (P1).
- Revisão cujo título colide com a chave, o alias ou o título ativo de outro mapa é recusada, com o outro mapa na mensagem (P2).
- Revisão que muda o título mostra antigo e novo e explica o efeito no histórico antes de publicar (P3).
- Grafia parecida (mesma chave sem separadores, como `IronMan` × `iron_man`) pede confirmação e não bloqueia (P5).
- Título com underscore ou espaços repetidos pede confirmação; o TXT nunca é reescrito (P7).

## Critérios de aceite
- [ ] Cada caso acima é testado na API e aparece no painel, em pt-BR e nos demais idiomas.
- [ ] Revisão com o próprio título ou com um alias do próprio mapa publica sem conflito.
- [ ] Confirmações ficam registradas na auditoria da publicação.

## Notas de implementação
