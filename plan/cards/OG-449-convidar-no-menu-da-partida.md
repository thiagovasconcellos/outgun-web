# OG-449 — "Convidar amigo (Steam)" no menu da partida

| Campo | Valor |
|---|---|
| Épico | E9 |
| Tipo | Feature |
| Prioridade | Should |
| Estimativa | 2 pts |
| Sprint | S62 |
| Status | Concluído |
| Dependências | OG-447 |
| Regras de negócio | RN-UI-05 |
| Skills | `outgun-card-workflow` |

## História
Como jogador na Steam no meio de uma partida, quero chamar um amigo para a sala sem sair do jogo, para ele entrar na partida que está rolando.

## Contexto
- O Esc abre o menu da partida (`menuOpen` em `apps/web/src/screens/GameScreen.tsx`). O HUD não muda (RN-UI-05).
- Vale para qualquer sala (pública, personalizada, Ranked em jogo). No lobby Ranked o botão é o do OG-450.

## Escopo
- Item "Convidar amigo (Steam)" no menu do Esc, só com `steamAvailable()`, que chama `steamInvite` com a sala atual (e token, se tiver senha).
- Enquanto o overlay da Steam está aberto o input do jogo fica desligado, como no menu.

## Critérios de aceite
- [x] O item aparece no menu do Esc só no app aberto pela Steam; HUD sem mudança (`pnpm visual:check`).
- [x] O item abre a janela de convite da Steam por cima da partida; fechar volta ao jogo sem tecla presa nem tiro disparado.
- [x] Partida online de verdade conferida, com capturas ao PO.

## Notas de implementação
- Item "Convidar amigo (Steam)" no menu do Esc, só no app da Steam e em sala online; HUD sem mudança (o menu já desliga o input). Conferência numa partida real com o PO.
