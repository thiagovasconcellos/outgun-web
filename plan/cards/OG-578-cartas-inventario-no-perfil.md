# OG-578 — Cartas de Jogador: coleção no perfil (inventário pessoal)

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S61 |
| Status | Pronto |
| Dependências | OG-572, OG-576 |
| Regras de negócio | RN-CRT-07, D-94 |
| Skills | `outgun-card-workflow` |

> Origem: proposta "Cartas de Jogador" (https://claude.ai/artifact/4o8tyipW7tQp8yESK5PxAt, cópia em `plan/specs/cartas-de-jogador/proposta.html`) e respostas do PO P1–P20 em 2026-11-05. Decisão D-94.

## História
Como jogador, quero ver minhas cartas no meu perfil e quantas faltam, para acompanhar a coleção.

## Contexto
- Perfil em `apps/web/src/screens/Profile.tsx`.

## Escopo
- Seção "Outgun Player Cards" no perfil: contador geral e por classe (ex.: 3/30 Clássico); as cartas que a pessoa tem, da mais rara para a mais comum. **As que faltam não aparecem**: só o espaço "?" contado (P14).
- Quem não tem nenhuma vê a coleção vazia, "0/85 a descobrir", e como resgatar.
- No perfil de outra pessoa aparecem as cartas dela (só a frente); a página de detalhes só abre para quem também tem a carta (P14, P15).
- API: `GET /players/:id/cards`.

## Critérios de aceite
- [ ] Perfil sem cartas mostra 0/x e nenhuma carta não descoberta é revelada (nem pelo JSON da API).
- [ ] Clicar numa carta que eu tenho abre a página dela.

## Notas de implementação
(preenchido durante a execução)
