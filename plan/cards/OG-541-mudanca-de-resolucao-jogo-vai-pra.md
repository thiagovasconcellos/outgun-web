# OG-541 — Mudança de resolução jogo vai pra outra tela

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Bug |
| Prioridade | Could |
| Estimativa | 2 pts (provisória, estimar no refinamento) |
| Sprint | S58 |
| Status | Backlog |
| Dependências | — |
| Issue | [#30](https://github.com/thiagovasconcellos/outgun-web/issues/30) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que isto deixe de acontecer: Mudança de resolução jogo vai pra outra tela

## Contexto
- Issue #30 (área: Partida / HUD; gravidade: Baixo; frequência: Aconteceu uma vez).
- Versão: 2.56.3 · Dispositivo: computador · Navegador e sistema: app desktop/Steam no Windows · Sala / mapa: sala main, mapa The Blunt · Data e hora: Sun Nov 01 2026 12:44:17 GMT-0300 (America/Sao_Paulo) · Apelido no jogo: Felix
- Passos: 1. Usando dois monitores ao trocar a resolução nas opções a janela do jogo é enviada para o segundo monitor, mesmo colocando ela de volta no monitor 1, ao pressionar F11 para ir pra tela cheia o jogo vai para o monitor 2 novamente.
- Esperado: Trocar de resolução ou ir pro modo fullscreen e manter o jogo no mesmo monitor
- Obtido: Usando dois monitores ao trocar a resolução nas opções a janela do jogo é enviada para o segundo monitor, mesmo colocando ela de volta no monitor 1, ao pressionar F11 para ir pra tela cheia o jogo vai para o monitor 2 novamente.
- Evidências: Última partida: https://outgunweb.com.br/matches/05eca24f-4c5b-4904-b1fa-bc311fbb7300
- Contorno: —

## Escopo
- Corrigir a causa; teste que reproduz o caso.

## Critérios de aceite
- [ ] O caso da issue não acontece mais (teste).
- [ ] PO confere.

## Notas de implementação
(preenchido durante a execução)
