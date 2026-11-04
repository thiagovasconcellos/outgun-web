# OG-553 — Partidas presas à revisão: servidores e cliente carregam por revisão

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | S60 |
| Status | Em revisão |
| Dependências | OG-552 |
| Regras de negócio | RN-MRV-04 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu (arquiteto de mapas da comunidade), 2026-11-02 — cópia em `plan/specs/mapas-revisoes/`. Decisão D-91.

## História
Como jogador, quero que o mapa não mude no meio da partida e que todos joguem a mesma geometria, para que uma revisão nova só valha na próxima partida.

## Contexto
- O game server lê nativos de `MAPS_DIR` e os da moderação pelo heartbeat (`PanelMaps.sync`, nome + CRC); o cliente pega nativos dos assets e o resto em `<server>/maps/<nome>.txt` (`apps/web/src/game/map-loader.ts`).

## Escopo
- O game server passa a receber do heartbeat a lista de mapas jogáveis com revisão ativa (chave, revisão, CRC, SHA-256) e baixa da API o texto de cada revisão (nativos inclusive; a pasta vira só reserva da revisão 1).
- A sala prende a revisão ao **trocar de mapa**: nova publicação ou troca de rotação só entra na troca seguinte. `mapChange` leva também o número da revisão.
- O cliente carrega pela revisão anunciada (`/maps/:key/rev/:n.txt`), com cache por SHA-256; nativo sem revisão nova continua vindo dos assets.
- Espectador ao vivo e prévia da votação de mapa usam a mesma revisão da sala.

## Critérios de aceite
- [x] Publicar revisão durante a partida não muda as paredes dela; a próxima partida usa a revisão nova.
- [x] Os 6 nativos sem revisão continuam jogáveis sem baixar nada novo.
- [x] Servidor satélite (`es`) recebe e usa a mesma revisão que o `br`.

## Notas de implementação
- `PanelMaps` virou o catálogo do heartbeat: nativo com o CRC da pasta usa a pasta; o resto baixa `/maps/<chave>/rev/<n>.txt` e confere CRC + SHA-256. Nativo fora da lista fica de fora das salas (só quando a API já lista nativos). Textos de toda revisão carregada ficam guardados por CRC.
- A sala prende geometria, texto e número na troca de mapa (`pinRevision`, RN-MRV-04); `room.mapRevision` dá a revisão em jogo.
- `mapChange` **não** ganhou campo novo: o CRC já identifica a revisão e mudar a mensagem quebraria clientes antigos. O cliente compara o CRC do asset com o anunciado e, se diferir, baixa `<server>/maps/<nome>.txt?crc=N` (imutável, cache longo).
- Critérios conferidos por leitura do código; a conferência no beta (`br` e `es`) fica para o roteiro do OG-561.
