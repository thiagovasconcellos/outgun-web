# OG-603 — Apertamos f8 e não mudou de mapa

| Campo | Valor |
|---|---|
| Épico | E11 |
| Tipo | Bug |
| Prioridade | Should |
| Estimativa | 2 pts |
| Sprint | S65 |
| Status | Concluído |
| Dependências | — |
| Issue | [#50](https://github.com/thiagovasconcellos/outgun-web/issues/50) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que isto deixe de acontecer: apertamos f8 e não mudou de mapa

## Contexto
- Issue #50 (área: Partida / HUD; gravidade: Médio; frequência: Às vezes).
- Versão: 2.64.0 · Dispositivo: computador · Navegador e sistema: app desktop/Steam no Windows · Sala / mapa: sala r-8ywumvzf, mapa Cebs Park · Data e hora: Mon Nov 09 2026 23:00:13 GMT-0300 (America/Sao_Paulo) · Apelido no jogo: coiote
- Passos: 1. arrumar f8
- Esperado: mudar de mapa
- Obtido: não mudou
- Evidências: Última partida: https://outgunweb.com.br/matches/73d1b999-a677-4a59-8b20-9ed41759f2fe
- Contorno: —

## Escopo
- F8 (`voteMapChange`) envia `mapExit` e o servidor troca de mapa só quando "sair" > "contra" e já passou o bloqueio de voto (`shouldExit`, `map-vote.ts:84`). Com `requireSpecificMapVote` ligado, F8 sem escolher o mapa no F2 não vale (o servidor só avisa "sem efeito"). A causa mais provável é uma das duas: voto sem efeito mal explicado, ou voto que vale mas fica abaixo da maioria sem o jogador ver o placar x/y.
- Passo 1 (diagnóstico, sem mexer no código): abrir os dados da partida `73d1b999-…` (sala r-8ywumvzf, 2.64.0, mapa Cebs Park) e ver `requireSpecificMapVote` e `voteBlockTime` da sala, quantos humanos havia e se o aviso "sem efeito" ou "x/y votos" chegou ao cliente do jogador.
- Passo 2: se a regra está certa e a mensagem some, garantir que o jogador sempre vê o resultado do F8 (voto contado x/y, bloqueio restante, ou "escolha um mapa no F2"); se há defeito na regra, corrigir com teste. Não mover o HUD (RN-UI-05): só o texto das mensagens de informação existentes.
- A issue pede só "arrumar F8"; se o diagnóstico mostrar defeito de regra, registrar como D-NN.

## Critérios de aceite
- [x] Causa explicada nas notas do card.
- [x] Dois ou mais jogadores votando F8 trocam o mapa depois do bloqueio, e o jogador vê sempre o motivo de não ter trocado (teste do servidor + do feed).
- [ ] PO confere.

## Notas de implementação
Causa: a sala da issue (`r-8ywumvzf`) é de lobby Ranked, e ali `checkMapExit` sai cedo porque o mapa é votado no lobby (OG-254). O servidor ainda guardava o voto e anunciava "2/2 votos", o HUD marcava o F8, e nada acontecia. A regra do Casual está certa e já tinha teste (`room.test.ts`: maioria dos humanos, bots fora).
Correção: no Ranked o servidor não guarda o voto e responde "Ranked: o mapa é votado no lobby, então o F8 não tem efeito aqui."; o cliente apaga a marca do F8 (`voteRefused`). Testes em `ranked-lobby.test.ts` e `feed.test.ts`. Não mudou regra de voto, então sem D-NN.
Não conferido: os dados da partida `73d1b999-…` no beta (leitura negada nesta sessão); a causa vem do prefixo `r-` da sala.
