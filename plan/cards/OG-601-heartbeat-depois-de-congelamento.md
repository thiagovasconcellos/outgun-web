# OG-601 — Satélite volta ao lobby sozinho depois de um congelamento

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Bug |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | — |
| Status | Backlog |
| Dependências | OG-599 |
| Regras de negócio | RN-REG-03 |
| Skills | `outgun-card-workflow` |

> Origem: incidente de 2026-11-09/10 no servidor da Alemanha. O `dnf-makecache` (índice de 189 MB) chegou a 642 MB numa máquina de 945 MB; a VM ficou presa no swap das 19:03 à 01:02 UTC, até o kernel matar o `dnf`. O game-server voltou a responder (`/gs/health` ok), mas não mandou mais heartbeat e a região `de` sumiu do lobby até o contêiner ser reiniciado à mão (01:29 UTC). O mesmo `dnf-makecache` já tinha sido morto por falta de memória às 17:45 UTC.

## História
Como jogador na Europa, quero que o servidor da minha região volte ao lobby sozinho depois de um engasgo da máquina, sem depender de alguém reiniciar o contêiner.

## Escopo
- `apps/game-server/src/platform.ts` (`startHeartbeat`): a trava `busy` não pode ficar presa. Hipótese do incidente (não reproduzida): um envio ficou pendurado durante o congelamento, o `AbortSignal.timeout` não o encerrou e nenhum heartbeat saiu depois. Dar prazo próprio a cada envio (inclusive à leitura do corpo) e soltar a trava quando o prazo estourar.
- Vigia: se o game-server passar N segundos sem heartbeat aceito, registrar no log e, persistindo, encerrar o processo para o Docker reiniciar (`restart: unless-stopped`), desde que não haja partida com humanos.
- `deploy/vps/satellite/machine.sh` (Oracle Linux): desligar o `dnf-makecache.timer` (já feito à mão na VM da Alemanha em 2026-11-10) e limitar a memória do `dnf-automatic` (`MemoryMax` no serviço), que roda o mesmo `dnf` todo dia.
- Limite de memória no contêiner do game-server e do Caddy no compose do satélite, para o OOM do sistema nunca escolhê-los por último.
- Avaliar aviso ao PO quando uma região some do registro (hoje ninguém fica sabendo).

## Critérios de aceite
- [ ] Teste: envio de heartbeat que nunca responde não impede o envio seguinte.
- [ ] Game-server sem heartbeat aceito por N segundos se reinicia sozinho e volta ao lobby.
- [ ] `machine.sh` em Oracle Linux deixa o `dnf-makecache.timer` desligado e o `dnf-automatic` com teto de memória.
- [ ] VM da Alemanha conferida com a configuração nova.

## Notas de implementação
