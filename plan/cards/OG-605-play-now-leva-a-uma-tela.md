# OG-605 — Play now leva a uma tela preta com treino de mira mas nem isso abre

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Bug |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S65 |
| Status | Concluído |
| Dependências | — |
| Issue | [#52](https://github.com/thiagovasconcellos/outgun-web/issues/52) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que isto deixe de acontecer: Play now leva a uma tela preta com treino de mira mas nem isso abre

## Contexto
- Issue #52 (área: Partida / HUD; gravidade: Crítico; frequência: Sempre).
- Versão: 2.64.1 · Dispositivo: computador · Navegador e sistema: Chrome 156 no Linux · Data e hora: Tue Nov 10 2026 22:00:35 GMT-0300 (America/Sao_Paulo) · Apelido no jogo: jaru
- Passos: 1. clicar em  play now
- Esperado: jogar com itens
- Obtido: abre uma tela preta com "treino de mira"
- Evidências: Última partida: https://outgunweb.com.br/matches/aec59bf7-61fa-4d7e-ad98-e20793c2220e
- Contorno: play now da home e do menu nao podem ter o modo alterado

## Escopo
- "Jogar agora" (`play-now.ts`) chama `quickJoin('casual', …)`; em **qualquer** erro que não seja `beta_account_required` navega para `/play` sem `?sala=`, e a tela cai na sala `main` / treino local, a tela preta da issue. Falha da API (sem sala, satélite fora do ar, erro de rede) não vira mensagem, vira partida errada. O lobby (`lobby.tsx:203`) já mostra o erro; o botão da home e da barra superior, não.
- Diagnóstico: ver nos logs da API/Sentry o `quick-join` de 2026-11-10 22:00 (-03), v2.64.1, conta `jaru`, para saber por que falhou (candidato: sala escolhida num satélite que não respondeu, depois da S64/OG-601).
- Correção: `usePlayNow` mostra o erro (toast/mensagem) em vez de navegar para `/play`; se a causa for a escolha de servidor, tentar a próxima sala/região antes de desistir. Reaproveitar `joinErrorText` do lobby.
- O "Contorno" da issue ("play now da home e do menu não podem ter o modo alterado") parece pedir que o botão sempre entre em Casual; já é assim. Se o pedido era outro, perguntar na issue.

## Critérios de aceite
- [x] Falha no `quick-join` mostra mensagem na tela e não abre a tela preta (teste do hook).
- [ ] Causa da falha de 2026-11-10 identificada nas notas.
- [x] Sem sala disponível, o jogador entende o que fazer (criar sala ou treinar).
- [ ] PO confere.

## Notas de implementação
Causa achada no código: o `quick-join` não excluía salas de treino. A sala de Treino de mira que o jogador criou e deixou continua no ar por 5 min (OG-606), sem senha e com vaga, e era a escolhida: daí a "tela preta com treino de mira", sempre. Agora `rooms.training` não nulo fica fora do "Jogar agora" (teste em `registry.test.ts`).
Além disso, `usePlayNow` deixou de navegar para `/play` em erro: mostra aviso (toast) com o texto do lobby; sem sala, sugere criar sala ou treinar (`playNowFailure`, testado).
Logs do beta (2026-11-11): `POST /rooms/quick-join` às 00:58:38 e 00:58:51 UTC do mesmo endereço, pouco antes da issue (01:00 UTC), o que bate com o botão sendo tentado mais de uma vez; o log de entrada não diz a sala escolhida, então a sala de treino segue como causa deduzida do código.
