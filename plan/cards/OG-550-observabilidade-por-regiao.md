# OG-550 — Observabilidade com vários servidores

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Infra |
| Prioridade | Should |
| Estimativa | 3 pts |
| Sprint | S59 |
| Status | Em andamento |
| Dependências | OG-548 |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como PO, quero ver métricas, logs, erros e alertas do servidor de Madrid junto com os do Brasil, separados por região.

## Escopo
- Fluent Bit no satélite (mesmo `grafana-cloud.sh`) com rótulo `region`/`host`; painéis do Grafana Cloud com filtro por região.
- Sentry do game-server com a tag `region`.
- Alerta "servidor da região X sem heartbeat há 2 min" (a partir da tabela `game_servers` ou da métrica da API).
- Painel admin: lista de servidores com região, versão, salas, jogadores e último heartbeat.
- `oci-alarms.sh` aceita outro perfil/compartimento para os alarmes da conta de Madrid.

## Critérios de aceite
- [ ] Painel do Grafana mostra os dois servidores separados.
- [ ] Derrubar o satélite dispara o alerta.
- [ ] Painel admin lista os servidores por região.

## Notas de implementação
