# OG-540 — Campo evidencia permitir colar images com o ctrl v ou subir

| Campo | Valor |
|---|---|
| Épico | E9 |
| Tipo | Bug |
| Prioridade | Could |
| Estimativa | 3 pts |
| Sprint | S58 |
| Status | Em revisão |
| Dependências | — |
| Issue | [#29](https://github.com/thiagovasconcellos/outgun-web/issues/29) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que isto deixe de acontecer: Campo evidencia permitir colar images com o ctrl v ou subir

## Contexto
- Issue #29 (área: Portal (início, perfil, ranking, hall da fama); gravidade: Baixo; frequência: Sempre).
- Versão: 2.56.0 · Dispositivo: computador · Navegador e sistema: Chrome 156 no Linux · Data e hora: Fri Oct 30 2026 12:54:55 GMT-0300 (America/Sao_Paulo) · Apelido no jogo: jaru
- Passos: 1. abrir um ticket e tentar colar uma imagem no campo evidence
- Esperado: que a imagem cole e suba pra issue do github
- Obtido: so permite texto
- Evidências: Última partida: https://outgunweb.com.br/matches/f0be2954-81fb-4572-a8ca-c63c3b1b06d5
- Contorno: —

## Escopo
- Corrigir a causa; teste que reproduz o caso.

## Critérios de aceite
- [x] O caso da issue não acontece mais (teste da API em `beta.test.ts`; colar e anexar no formulário o PO confere).
- [ ] PO confere.

## Notas de implementação
- Ctrl+V de imagem no campo de evidências ou "Anexar imagem" (até 4): o navegador reduz (lado maior 1920 px, WebP) e manda a `POST /feedback/images` (corpo cru, até 2 MB, tipo conferido pelos bytes, 20/h por conta). Tabela nova `feedback_images` (migração 0050); `GET /feedback/images/:id` é público pelo uuid.
- Os ids vão em `bug.images` (só os do próprio jogador); a issue mostra `![Imagem N](.../api/feedback/images/id)` em Evidências; o painel mostra as miniaturas.
- Pendência: imagens sem relato (enviadas e removidas) ficam no banco; limpar se o volume pesar.
