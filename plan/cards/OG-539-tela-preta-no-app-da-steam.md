# OG-539 — Tela preta no app da Steam: recuperar o WebGL, console no app e erros do cliente

| Campo | Valor |
|---|---|
| Épico | E7 |
| Tipo | Bug |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S58 |
| Status | Em revisão |
| Dependências | OG-324, OG-401, OG-538 |
| Regras de negócio | D-58 |
| Skills | `outgun-card-workflow` |

## História
Como jogador da OutCup no app da Steam, quero que a partida nunca fique presa numa tela preta; se a placa de vídeo falhar, o jogo se refaz sozinho ou me diz o que fazer.

## Contexto
- Incidente de 2026-11-01 (semifinal da OutCup, OG-538): duas vezes a tela de ozzylords ficou preta ao entrar no jogo pelo app da Steam (Windows); na web, no mesmo confronto, funcionou. O servidor via o jogador conectado e a partida rodando, sem erro nos logs.
- Causa não confirmada. A troca de resolução (OG-401) está descartada: o PO jogou sem modo nas Opções e sem `--resolution=`, então o app não mexeu no monitor. Sobram as diferenças do app para o navegador na mesma máquina: o Chromium do Electron 44, as chaves `disable-gpu-vsync` e `disable-frame-rate-limit` (FPS livre, OG-373/OG-400) e a tela cheia ao abrir. O cliente (`apps/web/src/game/host.ts`) não trata `webglcontextlost`/`webglcontextrestored`, então qualquer perda do contexto deixa o canvas preto até recarregar.
- Sem como diagnosticar: o app não abre o console (menu nulo, sem atalho) e o cliente não manda erros em produção (`VITE_SENTRY_DSN` não vem no build do beta; o OG-514 cobre só os `log.error` do servidor).
- Aprovado pelo PO em 2026-11-02 para a próxima sprint. Reproduz sempre na máquina do PO (ver as notas).

## Escopo
- Cliente: na perda do contexto WebGL, aviso na tela ("Recuperando o vídeo...") e recriação do renderizador sem sair da sala; se não voltar em alguns segundos, oferecer recarregar (a volta pela conta devolve a vaga, OG-262). Telemetria do evento.
- App: Ctrl+Shift+I abre as ferramentas do desenvolvedor (diagnóstico com o jogador); logar no arquivo do app as falhas do processo da GPU (`child-process-gone`, `render-process-gone`) e recarregar a página se o renderizador morrer.
- Erros do cliente: `VITE_SENTRY_DSN` no build do beta (web e app), com a marca `desktop` e a versão do app.
- Com o console do app aberto na máquina do PO: isolar o gatilho (rodar o app sem `disable-gpu-vsync`/`disable-frame-rate-limit`, fora da tela cheia, e comparar `chrome://gpu` do app com o do navegador). Se for uma das chaves, ligá-la só depois de o jogo desenhar ou desligar onde a GPU falha.

## Critérios de aceite
- [x] Teste: `webglcontextlost` simulado (extensão `WEBGL_lose_context`) mostra o aviso e o jogo volta a desenhar depois do `restore`, sem nova conexão.
- [x] Teste: sem restauração no prazo, aparece a opção de recarregar.
- [x] App: Ctrl+Shift+I abre o console; queda do processo da GPU fica no log e a página recarrega.
- [ ] Erro forçado no cliente do beta chega ao Sentry com a marca `desktop`.
- [ ] PO confere no app da Steam no Windows: entra em partidas Ranked e da OutCup sem tela preta, na mesma máquina em que o problema apareceu.

## Notas de implementação
- PO (2026-11-02): ficou preto **as duas vezes** em que entrou no jogo pelo app, e só jogou pela web. Reproduz sempre na máquina dele: dá para diagnosticar com ele (console do app) antes de mexer.
- Alguns jogadores só jogam pelo app da Steam: o app precisa funcionar, e não basta indicar a web como saída.
- PO (2026-11-02): jogou sem escolher resolução nas Opções e sem `--resolution=` — OG-401 descartado.
- S58: o Sentry do cliente já estava ligado no beta desde o OG-434 (DSN no bundle, CSP liberada) e não registrou nada em 01/11: a tela preta não é erro de JavaScript, o que aponta para a GPU/contexto. Agora a perda do contexto vai ao Sentry (`area: webgl`, `client: desktop`, `desktopVersion`).
- Cliente: `render/context-loss.ts` (aviso "Recuperando o vídeo...", pede a volta pela `WEBGL_lose_context`, refaz o cache das salas; 8 s sem volta → "Recarregar"). App: Ctrl+Shift+I/F12, `outgun-desktop.log` (GPU, quedas, console), recarga ao cair a página (até 3/min) e as chaves `--outgun-vsync`, `--outgun-windowed`, `--outgun-no-gpu` para isolar o gatilho.
- Pendente com o PO, no build novo da Steam: abrir o console/log na máquina dele e testar as três chaves; se uma delas resolver, ligar a chave só depois do primeiro quadro ou desligá-la (card novo se mudar o padrão).
