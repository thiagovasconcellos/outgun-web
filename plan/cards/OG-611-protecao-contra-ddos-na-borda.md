# OG-611 — Proteção contra DDoS na frente do beta

| Campo | Valor |
|---|---|
| Épico | E7 |
| Tipo | Segurança |
| Prioridade | Should |
| Estimativa | 5 pts |
| Sprint | — |
| Status | Backlog |
| Dependências | — |
| Issue | — (pedido do PO em 2026-11-11) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como PO, quero uma camada contra ataque de volume na frente do site e do servidor de jogo, para que uma pessoa mal-intencionada não tire o jogo do ar com pouco esforço.

## Contexto
- Levantamento de 2026-11-11: o beta e o satélite `de` são VMs de 1 GB (Oracle Always Free) atendidas direto pelo Caddy, sem nada na frente. O satélite já parou por falta de memória sem ataque nenhum (OG-601).
- O que já existe: 8 conexões por IP e tamanho máximo de pacote no WebSocket (`server.ts`), limite de taxa por mensagem (`input-guard.ts`), limite de login e `RateLimit` na API.
- Restrições: só serviços gratuitos (a conta Oracle é Always Free); a latência do jogo não pode piorar de forma perceptível (D-74: 10 Hz, física congelada); o repositório é público, então o IP de origem não pode ficar em arquivo versionado.

## Escopo
- **Passo 1 (medição, decide o resto):** pôr um proxy gratuito com proteção de DDoS (candidato: Cloudflare, plano Free, que aceita WebSocket) na frente de um nome de teste e medir o RTT do WebSocket e a latência do input do Brasil e de Portugal, com e sem o proxy, com o script da S39. Registrar os números no card.
- **Se a latência for aceitável:** site, API e WebSocket atrás do proxy; `TRUST_PROXY` e o cabeçalho de IP real conferidos na API e no game-server (ban por IP e limite por IP continuam valendo); firewall da VM e da VCN aceitando 80/443 só das faixas do proxy; certificado e HSTS revistos no `Caddyfile`.
- **Se a latência piorar:** só site e API atrás do proxy, WebSocket direto num nome separado, e limites de conexão por IP no Caddy/firewall para o que ficar exposto.
- Satélite `de`: mesmo desenho, ou registrar por que fica de fora.
- Documentar no `deploy/vps/README.md` como ligar, desligar e o que fazer durante um ataque (modo de desafio do proxy).
- **Decisão do PO (vira D-NN):** mudar o DNS de `outgunweb.com.br` para o provedor do proxy; quem cria e guarda a conta.
- Fora do escopo: limites de recurso por contêiner e alarme de memória (card novo se a medição mostrar necessidade).

## Critérios de aceite
- [ ] Números de latência com e sem o proxy registrados no card, do Brasil e de Portugal.
- [ ] O IP de origem deixa de responder em 80/443 para quem não é o proxy (ou a exceção está registrada).
- [ ] Ban por IP e limite de conexões por IP continuam enxergando o IP real do jogador (teste ou conferência em produção).
- [ ] README do deploy com o procedimento.
- [ ] PO confere uma partida online depois da mudança.

## Notas de implementação
(preenchido durante a execução)
