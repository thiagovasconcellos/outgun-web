# OG-606 — Se eu saio da sala que criei a sala deveria fechar imediatamente

| Campo | Valor |
|---|---|
| Épico | E12 |
| Tipo | Bug |
| Prioridade | Should |
| Estimativa | 3 pts |
| Sprint | S65 |
| Status | Pronto |
| Dependências | — |
| Issue | [#53](https://github.com/thiagovasconcellos/outgun-web/issues/53) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que isto deixe de acontecer: se eu saio da sala que criei a sala deveria fechar imediatamente

## Contexto
- Issue #53 (área: Lobby e salas; gravidade: Médio; frequência: Sempre).
- Versão: 2.64.1 · Dispositivo: computador · Navegador e sistema: Chrome 156 no Linux · Data e hora: Tue Nov 10 2026 22:02:36 GMT-0300 (America/Sao_Paulo) · Apelido no jogo: jaru
- Passos: 1. criar uma sala e sair
- Esperado: que a sala morra com minha saida
- Obtido: sala continua na lista
- Evidências: Última partida: https://outgunweb.com.br/matches/aec59bf7-61fa-4d7e-ad98-e20793c2220e
- Contorno: —

## Escopo
- Sala criada pelo jogador some só depois de ficar vazia por `EMPTY_TIMEOUT_S` = 300 s (`rooms.ts:227-229`, `main.ts:97`); nesse tempo ela segue na lista do lobby. A issue pede que feche quando quem criou sai.
- Regra proposta: sala **não persistente** (as `r-…`/`p-…` criadas por jogador) fecha quando o último humano sai, depois de uma carência curta de **15 s** para recarregar a página, reconectar ou abrir a janela de amigos da Steam sem perder a sala. Bots não mantêm a sala viva. Salas persistentes (principal, Casual da API) e Ranked (regra própria de queda/volta, OG-261) ficam como estão.
- Servidor: `rooms.ts` troca o prazo de 300 s por esse para salas de jogador (`options` novo, `EMPTY_TIMEOUT_S` continua valendo para as demais). Garantir que a sala some também do lobby: confirmar se o heartbeat para a API remove na hora ou só no próximo ciclo e, se preciso, avisar a API ao fechar.
- **Confirmado pelo PO em 2026-11-11 (D-98):** fecha quando sai o último humano, com 15 s de carência; se o criador sai e restam outros, a sala continua.

## Critérios de aceite
- [ ] Criar sala, sair e esperar a carência: a sala sai da lista em segundos (teste de `rooms.ts` com relógio falso).
- [ ] Voltar dentro da carência mantém a sala (teste).
- [ ] Sala persistente, Ranked e sala com outro humano dentro não fecham (testes).
- [ ] PO confere.

## Notas de implementação
(preenchido durante a execução)
