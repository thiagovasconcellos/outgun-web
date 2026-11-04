# OG-568 — Treino de mira: 1 minuto atirando no bot preso no T4

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | S60 |
| Status | Em revisão |
| Dependências | OG-490, OG-491, OG-492, OG-498 |
| Regras de negócio | RN-TRN-04, RN-TRN-06, RN-TRN-09, D-93 |
| Skills | `outgun-card-workflow`, `outgun-asset-pipeline` |

> Origem: pedido do PO (2026-11-04), mapa `T4` de Nosferatu & coiote (cópia em `plan/specs/treino-de-mira/t4.txt`). Decisão D-93.

## História
Como jogador, quero treinar a mira atirando por 1 minuto num bot preso, com meta de quantidade e de precisão, para medir e melhorar a pontaria.

## Contexto
- Os 4 modos (OG-493 a OG-496) são `TrainingModeDef` em `apps/game-server/src/training-*.ts`; o juiz (`training.ts`) limita a tentativa a `ATTEMPT_LIMIT_FRAMES` (2 min) e trata o tempo esgotado como falha.
- Cadência atual: um tiro a cada 0,5 s (`shoot_interval`), até 120 tiros por minuto; a sim já conta `shots`/`hits` por jogador (`packages/sim/src/world/stats.ts`).
- T4: sala única (1x1), chão em círculo de raio ~4,5 no centro (8,6), gaiola de 4 pedacinhos de parede (22°, 157°, 202°, 337°) em volta do centro, um spawn (time 1), sem bandeiras. Os nativos só saem de `_legacy/maps` (intocável), então o T4 precisa de uma pasta própria de mapas de treino, servida ao game server (`MAPS_DIR`, Dockerfile) e ao cliente (manifesto de assets).

## Escopo
- Modo `aim` (Mira) em `@outgun/settings` (`TrainingModeId`, `TRAINING_LIMITS`: 1 bot, 0 aliados) e no game server (`training-aim.ts`). Mapa fixo **T4**: não usa a lista `TRAINING_MAPS` e não entra no catálogo nem nas rotações (D-93).
- Bot alvo (papel novo `target` no `TrainingRobot`, D-87): **imortal e não atira**; só se mexe dentro da gaiola, mais rápido nos níveis altos (fixo ou progressivo, RN-TRN-07). Imortal sem mexer na física do Casual: a sala zera o dano no alvo (gancho opcional como o `mayTakeFlag`; sem ele, nada muda).
- Tentativa de **60 s** depois da contagem; quem treina começa de um lado da gaiola (esquerda ou direita). Precisão = acertos no bot ÷ tiros disparados na tentativa (tiro na gaiola conta como erro).
- Fim aos 60 s (morte não acontece): **sucesso** com ≥ 70 tiros **e** ≥ 90 % de precisão; senão falha com o motivo (`aimFewShots` ou `aimAccuracy`). A tentativa do Mira não cai no limite de 2 min como falha por tempo.
- **Sucesso troca o lado** na tentativa seguinte (esquerda ↔ direita); falha repete o mesmo lado. O laço segue alternando, como nos outros modos (sucessos/tentativas no placar).
- `trainingState` leva também tiros, acertos e o tempo restante da tentativa, ao vivo (para o HUD do OG-569) e no resultado.
- Sem convidados no Mira por enquanto (o bot alvo não tem vaga a assumir); a sala recusa convite neste modo.
- Continua fora de estatísticas, ranking, radar, relatórios e marcos (OG-498).

## Critérios de aceite
- [x] Sala privada com o preset Mira abre no T4, com o bot preso no centro, imortal e sem atirar.
- [x] Tentativa de 60 s; 70 tiros com 90 % ou mais dão sucesso e trocam o lado; qualquer outro resultado é falha e repete o lado.
- [x] Tiros e acertos da tentativa chegam ao cliente ao vivo e no resultado.
- [x] Os bots do Casual não mudam (gravação de referência do OG-513 igual).
- [x] Testes do juiz do Mira (meta, troca de lado, motivo da falha) em `training.test.ts`.

## Notas de implementação
- Alvo (papel `target`): **parado**, sem atirar — a gaiola do T4 tem raio ~15 px, o mesmo do boneco, então ele não teria para onde andar; o nível não muda nada no Mira. Imortal pelo gancho opcional `mayTakeDamage` da sim (D-93; sem ele nada muda): o acerto conta (`stats.hits`) mesmo sem dano.
- T4 em `apps/game-server/training-maps/` (entra na imagem pelos `files`), carregado como mapa fixo do `PanelMaps` (fora do catálogo; o cliente baixa do game server como os da moderação). Quem treina nasce num ponto sorteado do lado da vez (esquerda/direita).
- `trainingState` ganhou `aim` e os motivos `aimGoal/aimShots/aimAccuracy` no fim das listas (sem trocar `PROTOCOL_VERSION`); mensagem nova `trainingAim` (136): tiros, acertos, décimos restantes e lado. Sala de Mira recusa outro humano (reconexão da mesma conta passa).
- Testes: `training-aim.test.ts` (meta, troca de lado no sucesso, falha repete o lado); os testes de treino existentes seguem passando.
