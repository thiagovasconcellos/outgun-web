# OG-600 — Limites das rotas internas para servidor de terceiros

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Segurança |
| Prioridade | Should |
| Estimativa | 3 pts |
| Sprint | — |
| Status | Backlog |
| Dependências | OG-597 |
| Regras de negócio | RN-REG-06 |
| Skills | `outgun-card-workflow` |

> Origem: levantamento do OG-597. O OG-597 tirou Ranked, série e OutCup do alcance de um servidor só Casual; o que segue abaixo continua aberto para quem tem o segredo dele.

## História
Como PO, quero limitar o que um servidor de terceiros consegue fazer pela API, para que o segredo dele não sirva para atingir jogadores em outros servidores.

## Escopo
- `POST /internal/admin-actions`: servidor só Casual só registra ação e ban em sala que ele hospeda. Hoje dá para banir qualquer conta, IP ou dispositivo de qualquer sala cadastrada, inclusive de outro servidor.
- `POST /internal/matches` Casual: a partida inventada conta para estatísticas Casual, marcos (`awardMilestones`) e liberação de resgate de carta (`noticeUnlockedClaims`). Só aceitar `userId` de quem recebeu ticket para aquela sala nesse servidor, ou não dar marcos e resgates em partida de servidor só Casual. Escolher na hora de refinar.
- `POST /internal/reports`: limite por servidor e marcar na fila da moderação de qual servidor veio a denúncia.
- `POST /internal/rooms/heartbeat`: servidor só Casual não assume o id de sala Casual da plataforma ou de outro servidor que esteja fora do ar (o OG-597 só bloqueou as Ranked).

## Critérios de aceite
- [ ] Servidor só Casual não consegue banir nem registrar ação em sala de outro servidor.
- [ ] Partida Casual inventada por ele não dá marco nem libera resgate de carta para conta que não jogou lá.
- [ ] Denúncia vinda dele tem limite e mostra a origem.
- [ ] Testes em `apps/api` cobrem os casos acima.

## Notas de implementação
