# OG-607 — Após o pause, o jogo fica dando soquinho por 5-10 segundos

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Bug |
| Prioridade | Should |
| Estimativa | 2 pts |
| Sprint | S65 |
| Status | Pronto |
| Dependências | — |
| Issue | [#54](https://github.com/thiagovasconcellos/outgun-web/issues/54) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que isto deixe de acontecer: Após o pause, o jogo fica dando soquinho por 5-10 segundos

## Contexto
- Issue #54 (área: Partida / HUD; gravidade: Médio; frequência: Sempre).
- Versão: 2.64.1 · Dispositivo: computador · Navegador e sistema: app desktop/Steam no Windows · Data e hora: Tue Nov 10 2026 23:21:18 GMT-0300 (America/Sao_Paulo) · Apelido no jogo: coiote
- Passos: —
- Esperado: Sair do Pause sem travamento
- Obtido: Trava por 5-10 segundos após o pause
- Evidências: Última partida: https://outgunweb.com.br/matches/65f50691-def9-44fc-937c-7aecd2ca30d1
- Contorno: —

## Escopo
- A issue tem poucos dados ("trava 5-10 s depois do pause"; título: "fica dando soquinho"). Pausa só existe no Ranked (`session.pause`); a retomada tem contagem de 3 s no servidor (`pause.ts`). Hipótese principal: o Ctrl de Ctrl+P é a tecla de ataque/soco; o `keydown` do Ctrl chega com a partida pausada (o servidor ignora o ataque, `room.ts:1266-1294`), mas o estado "ataque segurado" fica gravado no cliente/servidor e dispara em sequência na retomada até o próximo pacote de teclas limpo.
- Passo 1: reproduzir sem rodar o jogo, num teste: sequência de teclas (Ctrl↓, P↓, P↑, Ctrl↑) enviada durante `pause.active`, e ver o estado de `attackGun`/`attackOnce` quando a pausa termina. Conferir o replay da partida `65f50691-…` (2.64.1) para ver os pacotes de entrada no período.
- Passo 2: corrigir (ao pausar/retomar, zerar teclas de ataque seguradas no cliente e no servidor; o `release` de `input.ts:132` já faz isso no `blur`). Teste que reproduz o caso.

## Critérios de aceite
- [ ] Teste que reproduz o soco repetido depois da retomada e passa a ser verde.
- [ ] Ao retomar, o personagem não ataca sem tecla apertada.
- [ ] PO confere.

## Notas de implementação
(preenchido durante a execução)
