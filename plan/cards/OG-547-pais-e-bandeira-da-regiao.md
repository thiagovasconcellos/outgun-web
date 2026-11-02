# OG-547 — País e bandeira da região na lista de salas

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S59 |
| Status | Em revisão |
| Dependências | — |
| Regras de negócio | RN-REG-04 |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero ver a bandeira e o nome do país de cada sala, para saber onde ela roda além do ping.

## Contexto
- Hoje `REGION=beta` no servidor do beta; a lista só mostra o ping (`lobby.tsx:315`, `ranked-rooms.tsx:209`).

## Escopo
- A região é um código de país ISO 3166-1 alfa-2 em minúsculas (`br`, `es`); o heartbeat recusa outro formato.
- Beta passa a `REGION=br`; migração nova troca `beta` por `br` em `game_servers`, `net_reports` e onde mais houver.
- Bandeiras em SVG locais (pacote `flag-icons`, MIT, só as usadas ou o conjunto inteiro se for pequeno; registrar em CREDITS e no `check:licenses`). Nada de emoji (o Windows não mostra bandeira em emoji).
- Componente `Flag` no design system com o nome do país traduzido (`Intl.DisplayNames`) como texto alternativo/dica.
- Bandeira + país na lista de salas (Casual e Ranked), no "Agora no Outgun" da tela inicial, no painel admin (servidores e rede) e no relatório da partida ("Jogado em: Espanha").

## Critérios de aceite
- [x] Lista Casual e Ranked com bandeira e nome do país; ping continua.
- [x] Relatório da partida mostra o país do servidor.
- [x] Beta reporta `br` depois do deploy; dados antigos migrados.

## Notas de implementação
- `ui/Flag.tsx`: `RegionFlag`/`RegionCell` com SVG do flag-icons (só `br`, `es`, `pt` no build; outro país mostra só o texto) e nome por `Intl.DisplayNames`. Bandeira ao lado do ping nas listas Casual e Ranked, no nome da sala em "Agora no Outgun", na rede do painel admin e "Jogado em: Espanha" no relatório.
- O heartbeat **não** recusa região fora do padrão de país: `local` (desenvolvimento) e servidores antigos continuam valendo, só sem bandeira.
- Migração 0052 troca `beta` por `br`; `deploy/vps/compose.yml` passa a `REGION=br` e `DEFAULT_REGION=br` (a API). No deploy, enquanto o servidor velho drena, a região `br` pode estar sem servidor por instantes e a sala cai no outro (com log), sem erro.
- O relatório em PDF não mostra o país (fica para depois, se o PO quiser).
