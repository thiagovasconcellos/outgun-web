# OG-548 — Deploy de servidor satélite (só game-server) e atualização de todas as máquinas

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Infra |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | S59 |
| Status | Pronto |
| Dependências | OG-547 |
| Regras de negócio | RN-REG-05 |
| Skills | `outgun-card-workflow` |

## História
Como PO, quero subir um game-server oficial em outra máquina (Madrid) ligado à API do beta, com o mesmo jogo e a mesma versão, num único comando de deploy.

## Contexto
- `deploy/vps/deploy.sh` sobe a pilha inteira numa máquina (Postgres, Redis, API, game-server, web, Caddy).
- O game-server já fala com a API só por HTTP com HMAC (`/internal/*`) e confere os tickets pela JWKS; presets, rotações, mapas, bots e chat já vêm da API (`platform-config`). Por máquina ficam só variáveis do `.env` (`CASUAL_BOTS_FILL`, `GAMEMOD`, `MAX_*`).

## Escopo
- `deploy/vps/satellite/`: compose com game-server + Caddy (HTTPS automático, `/gs/*` e `/health`), `install.sh` próprio (mesmo endurecimento: firewall 22/80/443, swap, atualizações).
- `API_URL` e `TICKET_JWKS_URL` apontam para `https://outgunweb.com.br`; `GS_ID` e segredo próprios. O segredo novo entra em `INTERNAL_SECRETS` da API pelo próprio deploy.
- Conferir que as rotas `/internal/*` chegam pela internet só com HMAC válido e com limite de taxa (já existem por `/api/*`).
- Variáveis de partida (`CASUAL_BOTS_FILL`, `GAMEMOD`, limites) vêm da principal: o deploy copia, ou passam para a `platform-config` (preferível se for simples).
- CSP: `connect-src` do site inclui `wss://` e `https://` de cada satélite (lista `SATELLITES` no `.env` da principal); idem no app da Steam se ele tiver CSP próprio. CORS do `/health` do satélite para o ping.
- `deploy.sh` com `SATELLITES="root@IP:dominio ..."`: constrói as imagens uma vez (multi-arch se as máquinas forem de arquiteturas diferentes), atualiza primeiro os satélites (drenando as partidas), depois a principal; aborta se a versão do protocolo divergir.
- README do deploy com a seção "Servidor satélite".

## Critérios de aceite
- [ ] Satélite de teste (pode ser uma segunda VM local ou de staging) aparece no lobby com a região dele e recebe partidas.
- [ ] Um `deploy.sh` atualiza principal e satélite para o mesmo commit.
- [ ] Sem o segredo certo, o heartbeat do satélite é recusado.

## Notas de implementação
