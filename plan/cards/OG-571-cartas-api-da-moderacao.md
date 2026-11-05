# OG-571 — Cartas de Jogador: API da moderação (criar, editar, desativar, revisões, chances e gerações)

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | S61 |
| Status | Em revisão |
| Dependências | OG-570 |
| Regras de negócio | RN-CRT-02, RN-CRT-03, RN-CRT-05, D-94 |
| Skills | `outgun-card-workflow` |

> Origem: proposta "Cartas de Jogador" (https://claude.ai/artifact/4o8tyipW7tQp8yESK5PxAt, cópia em `plan/specs/cartas-de-jogador/proposta.html`) e respostas do PO P1–P20 em 2026-11-05. Decisão D-94.

## História
Como moderador, quero criar e corrigir cartas pela API do painel, com histórico, para manter o catálogo sem depender de deploy.

## Contexto
- Rotas do painel em `apps/api/src/routes/admin.ts` (papel de moderador/admin já existe); auditoria igual às outras ações do painel.
- Revisões no estilo do S60 (mapas): cada gravação guarda a versão anterior, sem fila de aprovação (P8, P19).

## Escopo
- Listar e buscar (nick, epíteto, clã; filtros de classe, geração e ativa/desativada) com contagem de campos preenchidos e de donos.
- Criar e editar: qualquer moderador ou admin; **salvar publica** (P8, P19). Cada gravação cria uma revisão (cópia da ficha, autor, data) e uma linha na auditoria.
- Desativar e reativar (moderador): desativada sai do sorteio na hora; quem já tem continua com ela.
- Histórico de revisões de uma carta com as diferenças campo a campo; restaurar uma revisão antiga grava uma revisão nova.
- Sugestões de posição: lista das posições já usadas (P11); busca de contas para vincular (nick da conta, P13).
- Gerações: admin cria, renomeia, reordena e desativa (P10). Chances por classe: moderador e admin editam os pesos (P2); a mudança vale para o próximo resgate e vai para a auditoria.
- Nick duplicado (mesmo nick normalizado) é recusado; nick parecido volta como aviso.
- OpenAPI regerado.

## Critérios de aceite
- [x] Moderador cria uma carta e ela já entra no sorteio; edita e o histórico mostra a diferença.
- [x] Jogador comum recebe 403 em todas as rotas.
- [x] Desativar tira a carta do sorteio sem tirar do inventário de quem tem.
- [x] Testes de rota (`routes/legend-cards.test.ts`).

## Notas de implementação
- Rotas em `apps/api/src/routes/legend-cards.ts` sob `/admin`: `cards` (lista, `positions`, `similar`, `accounts`, ficha com revisões, criar, gravar, `active`, `restore`), `card-odds` e `card-generations`. Auditoria `card-*`.
- Revisão guarda a ficha inteira (`data`); o painel calcula a diferença entre duas revisões. Gravar sem mudança não cria revisão. Mudar o nick muda o endereço (`slug`).
- Geração não se apaga, só desativa. Testes de banco (`routes/legend-cards.test.ts`) rodam no fechamento com Docker.
