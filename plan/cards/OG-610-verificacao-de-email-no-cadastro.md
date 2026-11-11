# OG-610 — Verificação de e-mail no cadastro

| Campo | Valor |
|---|---|
| Épico | E7 |
| Tipo | Segurança |
| Prioridade | Must |
| Estimativa | 5 pts |
| Sprint | S66 |
| Status | Pronto |
| Dependências | — |
| Issue | — (pedido do PO em 2026-11-11) |
| Regras de negócio | — (criar RN ao decidir o que fica travado) |
| Skills | `outgun-card-workflow` |

## História
Como PO, quero que a conta só valha por inteiro depois de confirmar o e-mail, para que conta descartável custe mais e um banido não volte em segundos.

## Contexto
- Levantamento de 2026-11-11: o cadastro é aberto (`BETA` não está ligado no `deploy/vps/compose.yml`) e não há confirmação de e-mail. Das 33 contas do beta, uma usa `ae@ae.ae`.
- O envio de e-mail já existe (`mailer`, Resend): boas-vindas (`auth.ts:135`, OG-515) e redefinição de senha (`auth.ts:227`).

## Escopo
- Migração nova: `users.email_verified_at` e tabela de tokens de confirmação (hash do token, validade de 24 h, uso único), no molde da redefinição de senha.
- No cadastro, o e-mail de boas-vindas passa a levar o link de confirmação; rota que confirma e tela do portal para o resultado (confirmado, vencido, já usado).
- Reenvio do link pelo portal, com limite de taxa por conta e por IP (`RateLimit` existente).
- Aviso no portal (faixa ou notificação) enquanto a conta não confirmou; trocar o e-mail da conta zera a confirmação.
- Painel admin: coluna "e-mail confirmado" na lista de contas.
- **Decisão do PO antes de começar (vira D-NN):**
  1. O que fica travado sem confirmação. Proposta: Casual liberado; Ranked, OutCup, resgate de carta, clã e denúncias só com e-mail confirmado.
  2. Contas já existentes. Proposta: todas ficam como confirmadas na migração, menos as de domínio que não recebe e-mail (hoje só `ae@ae.ae`), que veem o aviso.
- Fora do escopo: CAPTCHA no cadastro e bloqueio de e-mail descartável (card novo se a confirmação não bastar).

## Critérios de aceite
- [ ] Conta nova recebe o link; confirmar marca a conta; link vencido ou reutilizado é recusado (testes da API).
- [ ] Sem confirmação, as ações travadas respondem com erro próprio e o cliente mostra o que fazer (testes).
- [ ] Reenvio respeita o limite de taxa (teste).
- [ ] Contas existentes seguem a decisão do PO depois da migração (teste da migração).
- [ ] PO confere.

## Notas de implementação
(preenchido durante a execução)
