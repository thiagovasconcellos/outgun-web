# OG-545 — Região sempre informada e estrita ao abrir salas

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S59 |
| Status | Pronto |
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
- [ ] Com dois servidores (`br` e `es`) no ambiente local, um cliente com menor ping para `br` cai sempre em `br` nas quatro entradas, mesmo com `es` vazio.
- [ ] Sem região no pedido, a sala vai para a região padrão.
- [ ] Região sem vaga → outra região, com log `region_fallback`.
- [ ] Testes do `pickServer`/`placeRoom` e do quick-join cobrindo os casos acima.

## Notas técnicas
- `tools/dev` sobe dois game-servers locais com `REGION` diferente para o teste (porta e `GS_ID` próprios).

## Notas de implementação
