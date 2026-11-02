# OG-551 — Servidor oficial em Madrid (Oracle Always Free do PO)

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Infra |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S59 |
| Status | Bloqueado |
| Dependências | OG-545, OG-546, OG-547, OG-548 |
| Regras de negócio | RN-REG-05 |
| Skills | `outgun-card-workflow` |

> Bloqueado por: conta Oracle do PO em criação (eu-madrid-1) — o PO avisa quando estiver pronta.

## História
Como jogador europeu, quero um servidor oficial em Madrid, para jogar com ping baixo o mesmo Outgun do Brasil.

## Escopo
- Perfil novo na CLI `oci` para a conta do PO; criar a VM **só Always Free** (nunca Pay As You Go): A1 Flex ARM se houver capacidade, senão E2.1.Micro; VCN, regras de entrada 22/80/443, IP público reservado.
- DNS `mad.outgunweb.com.br` (registro A, nuvem cinza até o certificado sair).
- Endurecimento do OG-306 (SSH só chave, fail2ban, atualizações automáticas).
- Primeiro deploy pelo modo satélite (OG-548), `REGION=es`; salas fixas de `es` (OG-546).
- Medir ping de SP e de Lisboa/Madrid até os dois servidores e registrar no card.

## Critérios de aceite
- [ ] Madrid no lobby com bandeira da Espanha e salas fixas próprias.
- [ ] Jogador em Portugal cai em Madrid pelo "Jogar agora"; jogador no Brasil continua em SP.
- [ ] Deploy único atualiza as duas máquinas.

## Notas de implementação
