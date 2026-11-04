# OG-569 — Treino de mira no cliente: preset na sala privada e placar da tentativa

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S60 |
| Status | Concluído |
| Dependências | OG-568 |
| Regras de negócio | RN-TRN-09, RN-UI-05, D-93 |
| Skills | `outgun-card-workflow` |

> Origem: pedido do PO (2026-11-04). Decisão D-93.

## História
Como jogador, quero escolher o Treino de mira na criação da sala e acompanhar tempo, tiros e precisão enquanto atiro.

## Contexto
- Presets na criação da sala privada: `apps/web/src/screens/lobby.tsx` (escolha do modo e de `TRAINING_MAPS`); o estado do treino chega por `trainingState` e é desenhado em `apps/web/src/game/hud/online-hud.ts`.

## Escopo
- Lobby: modo **Mira** na lista de presets; com ele, o seletor de mapa some (T4 fixo) e ficam só nível (fixo/progressivo) e "mesmo início". Sem opção de convidar.
- HUD do treino (mesmo lugar e estilo do aviso de tentativa atual, RN-UI-05): tempo restante, tiros (`n/70`) e precisão (`n %`, 90 % como meta), ao vivo; no resultado, a razão (poucos tiros / precisão abaixo de 90 %) e "troca de lado" no sucesso.
- Textos em pt-BR e nos demais idiomas (`@outgun/i18n`).
- `pnpm visual:check` e conferência numa partida de treino real; capturas ao PO (exceção do HUD).

## Critérios de aceite
- [x] Mira aparece no lobby e abre a sala no T4.
- [x] Tempo, tiros e precisão atualizam ao vivo; resultado mostra a razão e a troca de lado.
- [ ] Nada do HUD existente se move (`visual:check` sem diferença fora do aviso do treino).

## Notas de implementação
- Lobby: "Treino - Mira" com o T4 fixo; só a opção "mesmo início" (o alvo não tem nível e o modo é individual).
- HUD: o tempo da tentativa vai no relógio que já existe (canto de cima) e uma linha nova logo abaixo dele mostra "Tiros n/70 - precisão n% (meta 90%)"; nada existente muda de lugar. Contagem e resultado usam a caixa do treino (lado da vez, motivo, troca de lado). No celular a linha não aparece (o relógio de lá fica nos itens).
- `visual:check` e a conferência numa partida real ficam para o fechamento da sprint.
