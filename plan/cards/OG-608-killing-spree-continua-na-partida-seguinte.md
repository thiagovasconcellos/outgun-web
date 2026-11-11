# OG-608 — Killing spree continua na partida seguinte

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Bug |
| Prioridade | Could |
| Estimativa | 2 pts |
| Sprint | S65 |
| Status | Em revisão |
| Dependências | — |
| Issue | [#55](https://github.com/thiagovasconcellos/outgun-web/issues/55) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que isto deixe de acontecer: killing spree continua na partida seguinte

## Contexto
- Issue #55 (área: Partida / HUD; gravidade: Baixo; frequência: Sempre).
- Versão: 2.64.1 · Dispositivo: computador · Navegador e sistema: Chrome 156 no Linux · Data e hora: Tue Nov 10 2026 23:22:23 GMT-0300 (America/Sao_Paulo) · Apelido no jogo: jaru
- Passos: 1. faca um ks, deixe terminar o jogo sem morrer e mate mais um no jogo seguinte
- Esperado: sem ks
- Obtido: ks
- Evidências: Última partida: https://outgunweb.com.br/matches/65f50691-def9-44fc-937c-7aecd2ca30d1
- Contorno: —

## Escopo
- O contador de matança do feed (`feed.ts:161`, `private readonly spree = new Map`) só zera quando o jogador morre ou sai (`playerLeft`/`kill`). Ao terminar a partida e começar a seguinte nada o limpa, então 9 mortes na partida A + 1 na B dispara "está em uma matança!" e o som `spree` (`sound-events.ts:94`). Sem tratamento de novo mapa, o mesmo vale para o aviso de "matança encerrada".
- Corrigir no cliente: zerar `spree` quando começa partida nova (mensagem de mapa/partida novo que o feed já recebe; achar o gancho no `Feed`, sem mover HUD). Conferir se o servidor mantém contagem equivalente (`grep` por contagem de frags em `room.ts`); se mantiver, zerar lá também.
- Teste: 9 mortes, fim de partida, 1 morte na seguinte → nada de "matança".

## Critérios de aceite
- [x] Teste do `Feed` reproduz o caso e passa.
- [x] Matança de verdade dentro da mesma partida continua sendo anunciada (teste).
- [ ] PO confere.

## Notas de implementação
O contador do feed (`MessageFeed.spree`) só zerava na morte ou na saída do jogador. Agora zera também no `gameOver` e no `mapChange` (troca por voto ou pelo admin, sem fim de partida), o que cobre tanto o anúncio indevido quanto o "matança encerrada" na partida seguinte. O som `spree` sai do mesmo fato (`spreeStarted`), então some junto.
O servidor não guarda contagem equivalente em `room.ts`; nada a mudar lá. Testes em `feed.test.ts` (o caso da issue e o anúncio normal, que já existia).
