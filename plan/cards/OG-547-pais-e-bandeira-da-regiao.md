# OG-547 — País e bandeira da região na lista de salas

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S59 |
| Status | Pronto |
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
- [ ] Lista Casual e Ranked com bandeira e nome do país; ping continua.
- [ ] Relatório da partida mostra o país do servidor.
- [ ] Beta reporta `br` depois do deploy; dados antigos migrados.

## Notas de implementação
