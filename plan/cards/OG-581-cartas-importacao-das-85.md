# OG-581 — Cartas de Jogador: importação das 85 cartas existentes a partir da pasta do PO

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S61 |
| Status | Em revisão |
| Dependências | OG-570, OG-571 |
| Regras de negócio | RN-CRT-02, RN-CRT-03, D-94 |
| Skills | `outgun-card-workflow` |

> Origem: proposta "Cartas de Jogador" (https://claude.ai/artifact/4o8tyipW7tQp8yESK5PxAt, cópia em `plan/specs/cartas-de-jogador/proposta.html`) e respostas do PO P1–P20 em 2026-11-05. Decisão D-94.

## História
Como PO, quero que as 85 cartas já feitas entrem no catálogo sem redigitar, para lançar a coleção completa.

## Contexto
- P18: o PO põe as cartas numa pasta e o agente converte. As cartas de exemplo são imagens no formato da proposta (nick, classe, posição, biografia, características, habilidades...).
- Mesmo cuidado das importações de mapas (RN-MRV-09): conferência, transação e idempotência.

## Escopo
- O agente transcreve cada imagem para um JSON da ficha (fora do repositório público; só a ferramenta entra no repo) e marca o que ficou incerto (nick, classe, cores, campos ilegíveis).
- Script `pnpm --filter @outgun/api cli cards import <arquivo.json>` com `--dry-run`: valida tudo pela validação compartilhada, mostra novas, alteradas e com erro; sem `--dry-run`, grava numa transação com revisão 1 e autor "importação"; rodar de novo não duplica (chave = nick normalizado).
- Relatório ao PO com as dúvidas antes da importação no beta; backup do banco antes de rodar em produção.

## Critérios de aceite
- [x] As 79 fichas recebidas passam no `--dry-run` sem erro (o PO mandou 79, não 85).
- [x] Importar duas vezes deixa 79 cartas (a 2ª rodada: 79 iguais).

## Notas técnicas
Espera a pasta com as 85 cartas; sem ela, o card entrega só o script e o teste com fichas de exemplo.

## Notas de implementação
- Transcrição: OCR do Vision (macOS) nas 79 imagens + metadados à mão (classe, cores, gerações, clãs, frase) em `~/.config/outgun/cartas/` (`meta.py`, `build.py`, `overrides.py`, `cartas.json`), fora do repo. Importadas no banco local; produção só no deploy, com backup.
- `node dist/cli.js cards import ARQUIVO [--dry-run] [--note]` (`legend-card-import.ts`): mesma validação do painel, idempotente pela chave do nick, ficha alterada vira revisão.
- O que as cartas reais pediram: frase até 120, título até 40, texto até 200; nick só de símbolos (":(" → endereço `x3a28`); gerações com data e história (migração `0060`, cronologia do PO), mostradas na página da carta e editáveis no painel.
- Respostas do PO (2026-11-05): THALES fica Clássico (sem "Super Clássico"), LOBITO com centro branco, MARLBORO Clássico, PHIN e CORVO_MAN na 1ª e 2ª geração, DUKE nas três (a biografia também). Em aberto: data da 4ª geração e ícones que a lista da ficha não tem.
