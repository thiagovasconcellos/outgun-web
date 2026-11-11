# OG-604 — Nao consegui abrir

| Campo | Valor |
|---|---|
| Épico | E7 |
| Tipo | Bug |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S65 |
| Status | Pronto |
| Dependências | — |
| Issue | [#51](https://github.com/thiagovasconcellos/outgun-web/issues/51) |
| Regras de negócio | — |
| Skills | `outgun-card-workflow` |

## História
Como jogador, quero que isto deixe de acontecer: Nao consegui abrir

## Contexto
- Issue #51 (área: Steam / app para computador; gravidade: Crítico; frequência: Aconteceu uma vez).
- Versão: 2.64.1 · Dispositivo: computador · Navegador e sistema: Chrome 156 no Linux · Data e hora: Tue Nov 10 2026 21:58:34 GMT-0300 (America/Sao_Paulo) · Apelido no jogo: jaru
- Passos: 1. tentei dar play no jogo e da o erro abaixo: 2. chdir "/home/marco/snap/steam/common/.local/share/Steam/steamapps/common/Outgun" 3. ERROR: ld.so: object '/home/marco/snap/steam/common/.local/share/Steam/ubuntu12_32/gameoverlayrenderer.so' from LD_PRELOAD cannot be preloaded (wrong ELF class: ELFCLASS32): ignored. 4. Game Recording - would start recording game 663760, but recording for this game is disabled 5. Adding process 8565 for gameID 663760 6. ERROR: ld.so: object '/home/marco/snap/steam/common/.local/share/Steam/ubuntu12_32/gameoverlayrenderer.so' from LD_PRELOAD cannot be preloaded (wrong ELF class: ELFCLASS32): ignored. 7. ERROR: ld.so: object '/home/marco/snap/steam/common/.local/share/Steam/ubuntu12_64/gameoverlayrenderer.so' from LD_PRELOAD cannot be preloaded (wrong ELF class: ELFCLASS64): ignored. 8. ERROR: ld.so: object '/home/marco/snap/steam/common/.local/share/Steam/ubuntu12_32/gameoverlayrenderer.so' from LD_PRELOAD cannot be preloaded (wrong ELF class: ELFCLASS32): ignored. 9. ERROR: ld.so: object '/home/marco/snap/steam/common/.local/share/Steam/ubuntu12_32/gameoverlayrenderer.so' from LD_PRELOAD cannot be preloaded (wrong ELF class: ELFCLASS32): ignored. 10. Adding process 8566 for gameID 663760 11. Adding process 8567 for gameID 663760 12. Adding process 8568 for gameID 663760 13. Adding process 8727 for gameID 663760 14. Adding process 8761 for gameID 663760 15. Adding process 8760 for gameID 663760 16. Game Recording - game stopped [gameid=663760] 17. Removing process 8760 for gameID 663760 18. Removing process 8761 for gameID 663760 19. Removing process 8727 for gameID 663760 20. Removing process 8568 for gameID 663760 21. Removing process 8567 for gameID 663760 22. Removing process 8566 for gameID 663760 23. Removing process 8565 for gameID 663760
- Esperado: jogar na steam
- Obtido: jogo nao abre
- Evidências: Última partida: https://outgunweb.com.br/matches/aec59bf7-61fa-4d7e-ad98-e20793c2220e
- Contorno: —

## Escopo
- O log da issue (Steam do Ubuntu em snap) mostra o processo subindo e sendo removido em segundos, sem janela: o `LD_PRELOAD` do overlay é só aviso. O padrão é o Electron morrendo no arranque por falta do sandbox: a Steam não instala o `chrome-sandbox` com setuid e o Ubuntu 24.04 bloqueia user namespaces sem ele. O README do desktop (`apps/desktop/README.md:64`) já pede `--no-sandbox` na opção de inicialização do Linux **em Steamworks**, o que depende de ação do PO e não vale para builds já distribuídos.
- Tornar o app independente disso: hook `afterPack` do electron-builder (Linux) renomeia o binário e cria um script `outgun` que dá `exec` nele com `--no-sandbox` (e repassa os argumentos). A janela só abre o site do jogo (`sandbox: true` do renderer e a navegação restrita continuam; o `--no-sandbox` só tira o sandbox de processo que o Ubuntu já bloqueia).
- Conferir se o script respeita a pasta da Steam (symlinks, bit de execução no `tar.gz`, OG-328) e o `.deb` do workflow.
- Pedir ao jogador (comentário na issue) a saída de `./outgun` rodado direto no terminal da pasta do jogo, para confirmar a causa antes de dar o card por encerrado. Se for outra causa (GPU, biblioteca ausente), o card muda de escopo.
- Fora do escopo: Steam Deck/SteamOS (mesmo build, testar se o PO tiver acesso).

## Critérios de aceite
- [ ] O `linux-unpacked` do workflow traz `outgun` como script com `--no-sandbox` e o binário real ao lado (teste do hook ou verificação no workflow).
- [ ] Windows e macOS não mudam.
- [ ] README do desktop atualizado: a opção de inicialização em Steamworks deixa de ser necessária.
- [ ] O jogador da issue confirma que abre na branch `beta`.

## Notas de implementação
(preenchido durante a execução)
