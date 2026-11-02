# OG-562 — Rascunho testável: revisão jogável só em sala privada antes de ativar

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Should |
| Estimativa | 3 pts |
| Sprint | S60 |
| Status | Backlog |
| Dependências | OG-553, OG-557 |
| Regras de negócio | RN-MRV-02, RN-MRV-10 |
| Skills | `outgun-card-workflow` |

> Origem: "Mais ideias" do artifact de mapas com revisões; a comunidade pediu na S60 (P8, 2026-11-02). Decisão D-91.

## História
Como moderador, quero publicar uma revisão como rascunho e jogá-la com a galera numa sala privada, para ajustar antes de ela valer em todas as partidas.

## Escopo
- No upload (OG-557), a opção **Publicar como rascunho**: a revisão é criada (imutável, numerada como as outras) mas não vira a ativa nem entra em rotação.
- Sala privada Casual: quem cria a sala sendo moderador pode escolher um rascunho na lista de mapas (marcado "rascunho"); os convidados jogam normalmente.
- Partida em rascunho grava revisão, replay e relatório como qualquer outra (OG-554/555), mas **não conta** para estatísticas públicas, marcos, ranking nem filtros por mapa (mesmo tratamento das partidas de treino, OG-498).
- No painel: **Ativar este rascunho** (vira a revisão ativa, a partir da próxima troca de mapa) ou deixá-lo no histórico. Rascunho mais antigo que a revisão ativa avisa antes de ativar.

## Critérios de aceite
- [ ] Rascunho não aparece nas salas públicas nem nas rotações até ser ativado.
- [ ] Moderador abre sala privada com o rascunho; convidado sem papel de moderador entra e joga.
- [ ] Partida no rascunho não muda estatísticas, marcos nem filtros do mapa.

## Notas de implementação
- Confirmado pelo PO (2026-11-02): só moderador escolhe rascunho ao criar a sala; os convidados não precisam de papel. Partidas de rascunho ficam fora das estatísticas.
