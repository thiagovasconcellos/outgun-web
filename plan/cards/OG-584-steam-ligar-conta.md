# OG-584 — Steam: ligar a conta do Outgun à conta Steam pelo app desktop

| Campo | Valor |
|---|---|
| Épico | E18 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | S62 |
| Status | Concluído |
| Dependências | OG-328, OG-396 |
| Regras de negócio | RN-CRT-10, D-95 |
| Skills | `outgun-card-workflow` |

> Origem: pedido do PO em 2026-11-05 (cartas também no inventário da Steam, só a imagem, sem texto). Decisão D-95.

## História
Como jogador do app da Steam, quero ligar minha conta do Outgun à Steam, para receber as cartas no meu inventário.

## Contexto
- D-77 evitou SteamID e chave de publicador no servidor; a D-95 revê isso só para o inventário.
- `steamworks.js` 0.4.0 no app desktop (`apps/desktop/main.js`).

## Escopo
- No app desktop com a Steam aberta, a conta logada é ligada sozinha: o app pede um ticket de sessão para Web API (`getAuthTicketForWebApi("outgun")`) e manda à API (`POST /account/steam`).
- A API confere o ticket na Steam (`ISteamUserAuth/AuthenticateUserTicket`, chave de publicador em `STEAM_WEB_API_KEY`, nunca no repo) e grava `users.steam_id` (único: um SteamID numa conta só; trocar de conta Steam substitui).
- Conta → "Steam": mostra a conta ligada e "Desligar". Navegador e `.exe` avulso: nada muda.
- Sem a chave configurada, a ligação fica desligada e o resto do jogo segue normal.

## Critérios de aceite
- [x] Ticket inválido ou de outro app é recusado.
- [x] O mesmo SteamID não fica em duas contas.

## Notas de implementação
- App: `steamAuthTicket` (ticket `getAuthTicketForWebApi("outgun")`); site liga sozinho uma vez por sessão (`useSteamAutoLink`) e a Conta ganhou o painel Steam (ligar/desligar, entregues).
- API `GET/POST/DELETE /account/steam` confere em `ISteamUserAuth/AuthenticateUserTicket` com `STEAM_WEB_API_KEY` (sem chave = desligado); `users.steam_id` único (migração `0062`). Privacidade atualizada. **Falta a chave de publicador no `.env` do servidor (PO).**
