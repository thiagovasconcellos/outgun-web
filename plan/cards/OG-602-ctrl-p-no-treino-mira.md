# OG-602 — Ctrl + P no treino mira

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Bug |
| Prioridade | Won't (v2) |
| Estimativa | 3 pts |
| Sprint | S65 |
| Status | Cancelado |
| Dependências | — |
| Issue | [#49](https://github.com/thiagovasconcellos/outgun-web/issues/49) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que isto deixe de acontecer: Ctrl + P no treino mira

## Contexto
- Issue #49 (área: Partida / HUD; gravidade: Baixo; frequência: Sempre).
- Versão: 2.63.0 · Dispositivo: computador · Navegador e sistema: app desktop/Steam no Windows · Sala / mapa: sala p-uhmnq0ta, mapa T4 · Data e hora: Sat Nov 07 2026 12:11:16 GMT-0300 (America/Sao_Paulo) · Apelido no jogo: coiote
- Passos: 1. Gostaria de solicitar a pausa (a opção Ctrl + P) para o Treino Mira, pois às vezes preciso  pausar durante o jogo e não perder o tempo
- Esperado: Pausar com a opção ctrl + p
- Obtido: Não pausou com a opção ctrl + p
- Evidências: Última partida: https://outgunweb.com.br/matches/44e6f7e3-89d2-45de-9532-19390944d9da
- Contorno: —

## Escopo
- Hoje Ctrl+P só funciona no Ranked: `host.ts` só envia `pauseRequest` se `session?.pause` existe, e o servidor só cria `RankedPause` para `mode === 'ranked'` (`room.ts:448`). No treino de mira a tecla não faz nada.
- Servidor: sala de treino (`options.training`, mira e demais modos do OG-490+) com um único humano aceita `pauseRequest`; pausada, ninguém se mexe (mesmo caminho do `pause?.active` em `room.ts:1266-1294`). Reaproveitar `pause.ts` com versão de um jogador, sem saldo, sem prazo de queda e sem voto do adversário; retomada com a contagem de 3 s.
- Cliente: `session.pause` passa a existir nessas salas; o aviso de pausa já usado no Ranked cobre o treino. Ctrl+P e a tecla Pause alternam pausar/retomar; nada novo no HUD (RN-UI-05).
- Fora do escopo: pausa no Casual com vários humanos (continua sem pausa).
- **Premissa a confirmar na revisão:** pausa só em treino com um humano.

## Critérios de aceite
- [ ] Ctrl+P no treino de mira pausa a partida (alvos, tempo e cronômetro parados) e outro Ctrl+P retoma com a contagem de 3 s (teste do servidor).
- [ ] Sala de treino com dois humanos, Casual e OutCup seguem sem pausa (teste).
- [ ] Ranked não muda (testes de `pause.test.ts` passam).
- [ ] PO confere.

## Notas de implementação
- Cancelado pelo PO (D-98, 2026-11-11): não deve existir pausa em treino; Ctrl+P continua só no Ranked.
