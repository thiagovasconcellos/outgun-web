# OG-550 — Observabilidade com vários servidores

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Infra |
| Prioridade | Should |
| Estimativa | 3 pts |
| Sprint | S59 |
| Status | Em revisão |
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
- [x] Derrubar o satélite dispara o alerta.
- [x] Painel admin lista os servidores por região.

## Notas de implementação
- Fluent Bit do satélite (`deploy/vps/satellite/fluent-bit/`): só game server, máquina e logs do jogo, `instance`=`GS_ID` e `host`=região; o `grafana-cloud.sh` serve para o satélite (sobe só o Fluent Bit onde não há banco).
- API expõe `outgun_game_server_heartbeat_age_seconds{server,region}` (servidores vistos em 7 dias, também depois de a API reiniciar); alerta `OutgunServidorSemHeartbeat` (> 2 min) com teste no promtool. As regras vão ao Grafana Cloud pelo `grafana-cloud-sync.sh`, quando o PO mandar.
- Erros do game server com as tags `region` e `server`; heartbeat manda a versão (`release`, migração 0053) e o painel admin (aba Rede) lista os servidores com estado, versão (destacada se diferente da API), salas e jogadores.
- `oci-alarms.sh` respeita `OCI_CLI_PROFILE` (antes lia sempre o primeiro tenancy). Painel com filtro por região no Grafana fica para quando o satélite estiver mandando dados (critério 1).
