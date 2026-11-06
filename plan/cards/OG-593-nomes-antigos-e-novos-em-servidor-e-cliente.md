# OG-593 — Nomes antigos e novos aceitos por servidor, cliente e semente

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | — |
| Status | Pronto |
| Dependências | OG-589 |
| Regras de negócio | RN-MRV-03, RN-MRV-12 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu, 2026-11-06, com as respostas P1..P10 — página em `plan/specs/nomes-de-mapas/proposta.html`. Decisão D-96.

## História
Como operador, quero que tudo aceite a chave antiga e a nova antes da troca, para que a migração não derrube partidas nem servidores.

## Contexto
- Achados da análise: `ROTATION` só com chaves novas impede o game server de subir (`main.ts:153`), porque a sala fixa nasce antes do catálogo e procura o nome na pasta.
- `PanelMaps.sync` esconde arquivos cujo nome saiu do catálogo, e `resolveRotation` descarta sem aviso o que não encontra.
- `TRAINING_MAPS` (`packages/settings/src/training.ts:25`) tem 5 chaves que mudam, e `rooms.ts:270` exige igualdade exata.
- `seedMaps` e `map-import.ts` procuram pela chave: recriariam os nativos com o nome antigo.
- Manifesto do cliente e `MapPreview` procuram pelo nome físico. O seletor de sala privada lista o manifesto se não houver rotação (`lobby.tsx:461`).

## Escopo
- Game server: arquivo nativo encontrado pelo CRC, não pelo nome; mapa da pasta reconhecido por chave nova e por alias.
- Sala fixa: não ficar presa ao arquivo da pasta depois da primeira sincronização (correção preventiva, sem caso real em produção).
- Rotação, sala privada, treino, heartbeat e validação do painel traduzem nomes antigos para a identidade.
- `seedMaps`, `panel_maps` e importação resolvem por `maps.id` e alias e não recriam nem revertem nomes.
- Cliente: nativos sem download extra, com o manifesto reconhecendo nome novo e antigo; replays e URLs antigos seguem pelo alias.
- Comparação de chave fixa em ferramentas e scripts (`tools/`) revista.

## Critérios de aceite
- [ ] Com uma chave trocada num banco de teste, reiniciar API e game server não duplica nem perde mapa.
- [ ] Game server sobe com `ROTATION` antiga, nova ou mista.
- [ ] Replay antigo (`outgun1`, `pari2`) abre com a geometria certa.
- [ ] Sala de treino abre nos 5 mapas com chave antiga e nova.
- [ ] Cliente em cache com chave antiga consegue criar sala.

## Notas de implementação
