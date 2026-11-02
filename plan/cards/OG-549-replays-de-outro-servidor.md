# OG-549 — Replays e espectador de partidas em outro servidor

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Feature |
| Prioridade | Should |
| Estimativa | 2 pts |
| Sprint | S59 |
| Status | Concluído |
| Dependências | OG-548 |
| Regras de negócio | RN-REG-05 |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero ver o replay e assistir ao vivo partidas jogadas em Madrid pelo mesmo portal, sem diferença das de SP.

## Contexto
- O replay fica na máquina que hospedou a partida (`REPLAY_PUBLIC_URL`, padrão `https://<servidor>/gs/replays`).

## Escopo
- Conferir e ajustar CORS do `/replays` do satélite e a CSP do site para baixar o replay de outro domínio.
- Espectador ao vivo e modo transmissão (OG-536) conectam no servidor da sala, qualquer que seja.
- Backup dos replays do satélite fica fora (retenção local de 30 dias, como hoje); anotar no README.

## Critérios de aceite
- [ ] Replay de partida do satélite abre pelo relatório da partida.
- [ ] Espectador ao vivo funciona numa sala do satélite.

## Notas de implementação
- Sem mudança de código: o replay é gravado com o endereço público do servidor que hospedou a partida (`REPLAY_PUBLIC_URL`, padrão `https://<satélite>/gs/replays`), o espectador usa o `spectateUrl` da sala (do `wsUrl` dela) e os mapas vêm do servidor da conexão; `/replays`, `/maps` e `/health` já respondem com CORS aberto e a CSP do site inclui o satélite (`SATELLITE_ORIGINS`, OG-548).
- Os dois critérios só dá para conferir com a VM de Madrid no ar (OG-551). Retenção e falta de backup dos replays anotadas no README do deploy (OG-548).
