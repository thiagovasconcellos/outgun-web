# OG-545 — Região sempre informada e estrita ao abrir salas

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S59 |
| Status | Em revisão |
| Dependências | — |
| Regras de negócio | RN-REG-01, RN-REG-02 |
| Skills | `outgun-card-workflow` |

## História
Como jogador no Brasil, quero que "Jogar agora", a sala privada e a sala Ranked abram num servidor perto de mim, para não cair em Madrid só porque lá está vazio.

## Contexto
- `pickServer` (`apps/api/src/registry.ts:40`) prefere a região pedida, mas sem região escolhe o servidor menos carregado em qualquer lugar.
- Hoje só o "Entrar rápido" da lista (`lobby.tsx:231`) manda a região. Não mandam: "Jogar agora" da tela inicial (`apps/web/src/app/play-now.ts:15`), criar sala privada (`lobby.tsx:517`) e criar sala Ranked (`ranked-rooms.tsx:232`).
- O ping por região já é medido no lobby (`/regions` + `/health` de cada região).

## Escopo
- Medição de ping por região num módulo compartilhado (com cache curto), usado por todas as entradas: "Jogar agora", "Entrar rápido", sala privada, sala Ranked e salas fixas.
- Todas essas chamadas mandam a região de menor ping.
- API: com região pedida e servidor dessa região com vaga, a sala vai para ela. Sem vaga na região, cai para outra e registra no log. Sem região no pedido (cliente antigo), escolhe a região padrão da plataforma (`DEFAULT_REGION`, padrão a do servidor principal), não o menos carregado global.
- O quick-join só junta o jogador a salas abertas da mesma região; sem sala aberta lá, abre uma nova na região dele.

## Critérios de aceite
- [x] Com dois servidores (`br` e `es`) no ambiente local, um cliente com menor ping para `br` cai sempre em `br` nas quatro entradas, mesmo com `es` vazio.
- [x] Sem região no pedido, a sala vai para a região padrão.
- [x] Região sem vaga → outra região, com log `region_fallback`.
- [x] Testes do `pickServer`/`placeRoom` e do quick-join cobrindo os casos acima.

## Notas técnicas
- `tools/dev` sobe dois game-servers locais com `REGION` diferente para o teste (porta e `GS_ID` próprios).

## Notas de implementação
- `apps/web/src/app/regions.ts`: ping por região compartilhado (cache de 60 s; a tela inicial já começa a medir). Só espera (até 1,5 s) com várias regiões e medição velha; com uma região só, ou sem medição ainda, responde na hora (pedido do PO: o beta com um servidor não ganha atraso na entrada). Todas as entradas mandam a região, inclusive o ticket de uma sala ainda fora do ar.
- `DEFAULT_REGION` (API) vale para pedido sem região e para a OutCup; sem ela, o comportamento de antes (o beta não muda até o OG-547 pôr `br`).
- Quick-join: sala aberta na região → sala fixa fora do ar (se a região tiver vaga) → sala aberta de outra região. Abrir sala nova por região depende das salas fixas por região (OG-546).
- O teste com dois servidores ficou no `registry.test.ts` (servidores simulados por heartbeat); não criei o modo de dois game-servers no `tools/dev`.
