# OG-542 — Musica mesmo mutando volta a tocar quando entra na partida casual

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Bug |
| Prioridade | Must |
| Estimativa | 1 pt |
| Sprint | S58 |
| Status | Em revisão |
| Dependências | — |
| Issue | [#31](https://github.com/thiagovasconcellos/outgun-web/issues/31) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que isto deixe de acontecer: Musica mesmo mutando volta a tocar quando entra na partida casual

## Contexto
- Issue #31 (área: Partida / HUD; gravidade: Alto; frequência: Sempre).
- Versão: 2.57.0 · Dispositivo: computador · Navegador e sistema: Chrome 156 no Linux · Data e hora: Sun Nov 01 2026 14:29:43 GMT-0300 (America/Sao_Paulo) · Apelido no jogo: jaru
- Passos: 1. mutar a musica e entrar no casual com itens
- Esperado: que nao toque a musica
- Obtido: musica volta a tocar
- Evidências: Última partida: https://outgunweb.com.br/matches/f0be2954-81fb-4572-a8ca-c63c3b1b06d5
- Contorno: —

## Escopo
- Corrigir a causa; teste que reproduz o caso.

## Critérios de aceite
- [x] O caso da issue não acontece mais (teste).
- [ ] PO confere.

## Notas de implementação
- Causa: a tela da partida fica em modo `off` até a sala responder; o tocador zerava a pausa quando ficava sem faixa, e a faixa da partida entrava tocando. O "mudo" do jogador era a pausa do alto-falante da barra de cima (ícone riscado).
- A pausa agora só zera ao desligar a trilha nas Opções. Teste em `player.test.ts`.
