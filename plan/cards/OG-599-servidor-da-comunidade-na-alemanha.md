# OG-599 — Servidor da comunidade na Alemanha (só Casual)

| Campo | Valor |
|---|---|
| Épico | E16 |
| Tipo | Infra |
| Prioridade | Must |
| Estimativa | 2 pts |
| Sprint | S64 |
| Status | Em andamento |
| Dependências | OG-597, OG-598 |
| Regras de negócio | RN-REG-03, RN-REG-05, RN-REG-06 |
| Skills | `outgun-card-workflow` |

> **Só subir depois do OG-597 no beta:** antes disso a máquina poderia receber salas Ranked.

## Máquina (conferido em 2026-11-07)
IP 141.147.24.18, `VM.Standard.E2.1.Micro` (1 OCPU, 1 GB, x86_64), `eu-frankfurt-1`, 30 GB de disco, usuário `opc`, SELinux ligado. O boot volume tem 47 GB (29,5 GB no `/`, 15 GB em `/var/oled`), mas a memória continua sendo a do Micro. Chave em `~/.ssh/outgun-de.key`, fora do repo. O Oracle Linux reserva 448 MB para o kernel de crash (`crashkernel=1G-64G:448M`) e sobram 498 MB; o beta, no mesmo shape, tem 952 MB. Sem o kernel de crash (depois do reboot), ficou com 945 MB. Portas 80/443 abertas na VCN pelo membro e conferidas pelo PO.

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
Subiu na v2.64.0 em 2026-11-07: `gs-de` em `CASUAL_ONLY_SERVERS`, certificado emitido com SELinux ligado, `main-de` online na API em `de`, `git config outgun.satellites` gravado. A primeira execução do `machine.sh` com 498 MB travou a VM; depois do reboot, com 945 MB, levou cerca de 25 min. Conexão TCP medida do computador do PO: 54 ms até `fra`, 207 ms até o beta. Falta o PO conferir os critérios no jogo, medir o ping do Brasil e ver o primeiro deploy normal com as duas máquinas.
