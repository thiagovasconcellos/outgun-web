# OG-574 — Cartas de Jogador: painel — criar e editar carta com prévia ao vivo

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | S61 |
| Status | Concluído |
| Dependências | OG-571, OG-572 |
| Regras de negócio | RN-CRT-02, RN-CRT-03, D-94 |
| Skills | `outgun-card-workflow` |

> Origem: proposta "Cartas de Jogador" (https://claude.ai/artifact/4o8tyipW7tQp8yESK5PxAt, cópia em `plan/specs/cartas-de-jogador/proposta.html`) e respostas do PO P1–P20 em 2026-11-05. Decisão D-94.

## História
Como moderador, quero preencher a ficha vendo a carta pronta, para cadastrar as lendas sem precisar desenhar nada.

## Contexto
- Formulário dos 11 campos da proposta (seção Telas da moderação → Nova carta).

## Escopo
- Campos: nick, epíteto, posição (texto livre com sugestões das já usadas, P11), biografia com contador, classe, gerações (do cadastro, P10), clãs em ordem, conquistas, frase dourada, lembrança, características e habilidades (ícone da lista fechada, título, texto; até 8), cores (anel: cores de clã; centro: 32 cores pessoais, P12), conta atual vinculada (busca de contas, P13), cartas ligadas e fontes.
- Sem campo de aval (P9) e sem situação: **Salvar** grava e publica (P8, P19); editar uma carta grava uma revisão nova.
- Prévia ao vivo da carta e da página; checklist do que falta; aviso de nick igual (bloqueia) ou parecido.
- Sair com alterações não salvas pede confirmação.

## Critérios de aceite
- [x] Criar uma carta pelo formulário a deixa no sorteio e no catálogo na hora.
- [x] Mudar a classe na ficha muda a prévia na hora.
- [x] Editar e salvar sem mudar nada não cria revisão.

## Notas de implementação
- Formulário em `admin-cards.tsx` (`CardForm`): posições por `datalist` com as já usadas, gerações do cadastro, conta por busca (contas já ligadas aparecem desabilitadas), clãs e cartas ligadas por vírgula, prévia `PlayerCard` ao vivo e checklist. Nick igual bloqueia o Salvar; parecido só avisa.
- Sair com alterações: "Cancelar" pede confirmação na tela e o navegador avisa ao fechar a aba (`beforeunload`). Edição tem "Nota para o histórico" opcional.
