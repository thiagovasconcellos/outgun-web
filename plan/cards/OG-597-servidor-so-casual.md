# OG-597 — Servidor só Casual

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | S64 |
| Status | Concluído |
| Dependências | OG-545, OG-548 |
| Regras de negócio | RN-REG-02, RN-REG-05, RN-REG-06 |
| Skills | `outgun-card-workflow` |

> Origem: pedido do PO, 2026-11-06, para o servidor cedido por um membro da comunidade na Alemanha. Decisão D-97.

## História
Como PO, quero marcar um servidor como só Casual, para aceitar máquinas de terceiros sem que o ranking dependa delas.

## Escopo
- **A marca fica na API, não no servidor:** lista `CASUAL_ONLY_SERVERS` (ids de servidor) no `.env` da principal. Nada no heartbeat, porque quem controla a máquina poderia declarar o que quisesse.
- `CASUAL_ONLY=1 bash deploy/vps/deploy-satellite.sh` registra o id nessa lista (`satellite/register.sh`, `deploy/vps/compose.yml`).
- Salas Ranked e da OutCup não abrem nesses servidores: `POST /rooms/ranked`, `placeRoom` para sala Ranked e `openRoom` em `apps/api/src/cup.ts`.
- `POST /internal/matches` recusa partida `ranked: true` vinda de servidor só Casual e registra em log.
- Pedido de Ranked com região que só tem servidor só Casual vai para outra região sem gravar `region_fallback` como alerta: é o comportamento esperado.
- Levantar o que mais um servidor só Casual consegue pelas rotas `/internal` (ação de moderação, marcos, drops de carta) e abrir card para o que precisar de limite.

## Critérios de aceite
- [x] Servidor na lista nunca recebe sala Ranked nem da OutCup, mesmo sendo o de menor ping ou o único com vaga na região pedida.
- [x] Sem nenhum outro servidor com vaga, o Ranked responde `no_server`, sem cair no servidor só Casual.
- [x] Partida `ranked: true` de servidor só Casual é recusada e não altera ranking, série nem OutCup.
- [x] "Jogar agora", entrar rápido, sala privada Casual e salas fixas Casuais funcionam normalmente nele.
- [x] Testes em `apps/api` cobrem os casos acima.

## Notas de implementação
Filtro único em `serversForMode` (`registry.ts`), usado por Ranked, entrada, lista e OutCup. O heartbeat ignora sala Ranked vinda dele e não deixa assumir id de sala Ranked; `/internal/matches` recusa também `mode: ranked` sem `ranked: true`, porque série e OutCup dependem do modo.
Achado fora do pedido: o `register.sh` confiava no que vinha do satélite (`declare` com chave da máquina, id e domínio livres), o que permitia executar comando na principal e escapar da marca trocando o `GS_ID`. Agora valida tudo, e id, segredo e domínio novos só com pedido de quem faz o deploy. Migrar satélite já existente não se aplica: Madrid não subiu.
Levantamento das outras rotas `/internal`: OG-600.
