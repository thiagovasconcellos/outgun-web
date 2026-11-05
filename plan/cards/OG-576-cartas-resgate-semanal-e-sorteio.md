# OG-576 — Cartas de Jogador: resgate semanal e sorteio sem repetir no servidor

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | S61 |
| Status | Pronto |
| Dependências | OG-570 |
| Regras de negócio | RN-CRT-04, RN-CRT-05, RN-CRT-06, RN-CRT-08, D-94 |
| Skills | `outgun-card-workflow` |

> Origem: proposta "Cartas de Jogador" (https://claude.ai/artifact/4o8tyipW7tQp8yESK5PxAt, cópia em `plan/specs/cartas-de-jogador/proposta.html`) e respostas do PO P1–P20 em 2026-11-05. Decisão D-94.

## História
Como jogador, quero resgatar 2 cartas por semana quando jogo, sem nunca repetir, para completar a coleção jogando.

## Contexto
- Partidas jogadas: tabelas de partidas da API (Casual e ranqueadas); treino não grava partida (RN-TRN-01).
- Rng do servidor; nada de sorteio no cliente.

## Escopo
- Semana de segunda 00:00 a domingo 23:59 (Brasília). Com **3 partidas** Casual ou ranqueadas na semana, a conta libera **2 resgates** naquela semana (P4, P5). Resgate não usado não passa para a semana seguinte.
- `GET /cards/claims`: partidas da semana, resgates liberados e usados, quando abre a próxima semana.
- `POST /cards/claims`: sorteia no servidor, na hora, e grava a carta (idempotente por conta+semana+sequência; duplo clique não gera dois resgates).
- Sorteio: classe pelo peso (`card_class_odds`) entre as classes com carta **ativa que a conta ainda não tem**; os pesos das classes esgotadas saem da soma; depois uma carta uniforme da classe. **Nunca repete** (P6). Coleção completa: resgate indisponível com a mensagem "Você tem todas as cartas".
- Número da cópia: próximo da sequência da carta; se a carta for a da conta vinculada, a cópia é a **nº 0** (P1, P13).
- Notificação no portal quando os 2 resgates da semana ficam liberados.

## Critérios de aceite
- [ ] Conta com 2 partidas na semana não resgata; com 3, resgata 2 e o terceiro é recusado.
- [ ] Partidas de treino não contam.
- [ ] Em 10 mil resgates simulados nenhuma conta recebe repetida e a distribuição por classe segue os pesos.
- [ ] Testes da regra da semana (virada de domingo para segunda em Brasília) e do sorteio.

## Notas técnicas
Contar partidas pela data de fim no fuso de Brasília. Sem compra, sem moeda e sem troca (RN-CRT-08).

## Notas de implementação
(preenchido durante a execução)
