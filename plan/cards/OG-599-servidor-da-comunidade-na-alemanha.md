# OG-599 — Servidor da comunidade na Alemanha (só Casual)

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Infra |
| Prioridade | Must |
| Estimativa | 2 pts |
| Sprint | S64 |
| Status | Bloqueado |
| Dependências | OG-597, OG-598 |
| Regras de negócio | RN-REG-03, RN-REG-05, RN-REG-06 |
| Skills | `outgun-card-workflow` |

> Bloqueado por: OG-597 no beta e as portas 80/443 abertas na VCN pelo membro.
> **Só subir depois do OG-597 no beta:** antes disso a máquina poderia receber salas Ranked.

## Máquina (conferido em 2026-11-07)
IP 141.147.24.18, `VM.Standard.E2.1.Micro` (1 OCPU, 1 GB, x86_64), `eu-frankfurt-1`, 30 GB de disco, usuário `opc`, SELinux ligado. O boot volume tem 47 GB (29,5 GB no `/`, 15 GB em `/var/oled`), mas a memória continua sendo a do Micro. Chave em `~/.ssh/outgun-de.key`, fora do repo. O Oracle Linux reserva 448 MB para o kernel de crash (`crashkernel=1G-64G:448M`) e sobram 498 MB; o beta, no mesmo shape, tem 952 MB. A porta 22 responde; 80/443 não responderam de fora com o firewall da VM aberto e um servidor de teste subindo, então devem estar fechadas na VCN (teste único, de 2026-11-07, sem conferir se o servidor já escutava).

## História
Como jogador na Europa, quero uma sala Casual com ping baixo enquanto o servidor oficial de Madrid não sai.

## Escopo
- Decisão do PO (2026-11-07): fica no Oracle Linux; `satellite/machine.sh` prepara Ubuntu/Debian e Oracle Linux 9.
- Preparação pelo membro na conta Oracle dele: abrir 80/443 na VCN.
- Nosso primeiro acesso: entrar como `opc`, copiar a chave para `/root/.ssh/authorized_keys` com `sudo` (o deploy entra como `root`), rodar o `machine.sh` e reiniciar uma vez para liberar a memória do kernel de crash.
- DNS: registro A `fra.outgunweb.com.br`, nuvem cinza até o certificado sair.
- Primeiro deploy: `DOMAIN=fra.outgunweb.com.br REGION=de CASUAL_ONLY=1 bash deploy/vps/deploy-satellite.sh root@141.147.24.18`, depois `git config outgun.satellites`. Hoje essa chave está vazia; quando Madrid sair, ela lista as duas máquinas.
- `MAX_ROOMS` fica no padrão de 6, feito para este shape. Não rodar `grafana-cloud.sh` nela: o token ficaria com quem administra a VM.
- Medir o ping de Portugal e do Brasil até os dois servidores e registrar aqui.

## Critérios de aceite
- [ ] Alemanha aparece no lobby Casual com bandeira, nome e sala fixa `main-de`.
- [ ] Jogador com menor ping até lá cai nela pelo "Jogar agora"; jogador no Brasil continua em `br`.
- [ ] Sala Ranked criada da Europa abre em `br`.
- [ ] O deploy normal atualiza as duas máquinas na mesma versão.

## Notas de implementação
