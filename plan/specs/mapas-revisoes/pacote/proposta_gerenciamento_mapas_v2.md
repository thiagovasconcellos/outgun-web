# Outgun Web V2 — gerenciamento de mapas e revisões

**Proposta de implementação para Ozzy / Claude**  
**Data:** 2026-11-02  
**Status:** especificação para análise, implementação e testes; **não é autorização para alterar a produção sem validação**.  
**Materiais anexos:** `mapas_revisados.zip` (23 TXT) e `inventario_mapas.csv` (inventário e vínculos propostos).

## 1. O pedido em poucas linhas

Queremos que **qualquer mapa** — nativo do jogo, publicado por um moderador, novo ou antigo — possa passar pelo ciclo normal de **publicar → jogar/testar → ajustar → publicar revisão**, sem transformar cada revisão em outro mapa independente, sem exigir intervenção manual do desenvolvedor e **sem perder a geometria correta de partidas e replays antigos**.

Aproveitaremos essa melhoria para publicar as **23 versões revisadas por Nosferatu**, incluindo as revisões dos mapas que já são nativos da V2. Seus originais devem continuar recuperáveis para fins históricos, enquanto a versão revisada passa a ser a usada em novas partidas, conforme as rotações. **Este é um pacote de implantação inicial, não uma lista definitiva de mapas ou revisões.** Outros mapas poderão ser publicados ou revisados futuramente pelo painel, mas não fazem parte desta entrega.

A proposta deve ser aplicada **como um conjunto**, incluindo migração e testes de aceitação. O Larhi pode servir de cenário demonstrativo, mas **não** queremos depender de sucessivos pedidos para implementar as outras correspondências ou permitir revisões dos demais mapas.

## 2. Por que isto é necessário (independentemente de qualquer padronização)

É normal criar um mapa, jogá-lo com a comunidade e só então perceber que é preciso ajustar uma parede, passagem, base, spawn ou outro elemento. Essas alterações fazem parte da manutenção normal de mapas multiplayer. O sistema deve permitir que qualquer moderador autorizado baixe o TXT, faça a alteração e publique uma revisão do **mesmo mapa**, preservando o histórico anterior.

Hoje, na V2 examinada, há **duas trilhas distintas**: mapas nativos dos assets e mapas enviados pela moderação. Os da moderação já possuem registros versionados (`panel_maps` / `panel_map_versions`), mas o mecanismo não está integrado aos nativos nem à identificação histórica de partidas. Isso produz **três problemas relevantes**:

1. **Revisão e identidade fragmentadas.** O painel pede um nome técnico independente de `P title`. Como nomes são tratados com distinção de maiúsculas e minúsculas, `mooca` e `Mooca` puderam coexistir. Também é possível chamar um mapa de `Pari2` no painel enquanto o TXT diz `Pari 2`. Isso gera duplicidades e inconsistências nas telas; análises por mapa e contagens de mapas distintos podem separar versões que deveriam pertencer à mesma identidade.
2. **Preservação histórica incompleta.** Os replays de mapas da moderação e mapas gerados normalmente incorporam seu texto, mas os dos mapas nativos normalmente recuperam a geometria dos assets. Se esses assets forem simplesmente substituídos, um replay de partida disputada com cantos arredondados pode ser exibido com cantos retos. As miniaturas dos relatórios também consultam a geometria disponível **agora**, não necessariamente aquela utilizada na partida.
3. **Fluxo de manutenção pouco prático.** O painel não oferece um caminho uniforme de baixar qualquer mapa, enviar revisão de um nativo ou de um mapa de outro moderador, consultar/recuperar revisões e administrar uma biblioteca sem entradas duplicadas na lista principal. Atualizar um mapa não deveria depender de improvisações de nomenclatura nem de pedir ao Ozzy para editar arquivos manualmente.

A questão não é a quantidade de revisões **armazenadas**: podemos guardar muitas. O que importa é que cada uma tenha **identidade, histórico e disponibilidade** corretos, sem poluir o catálogo corrente.

## 3. Contexto da primeira migração (revisões de Nosferatu)

No servidor antigo hospedado na AWS, Nosferatu mantinha uma biblioteca revisada. A comunidade apelidou informalmente essa convenção de "padrão FIOA". **Não é necessário usar essa expressão no produto.** As revisões cuidam de nomes de arquivos e títulos, paredes de 1 unidade em escala `S 16 12`, cantos retos, um spawn por equipe coincidente com sua bandeira, orientação convencionada das bases e organização/ordenação dos comandos no TXT.

**Importante:** a natureza das alterações varia. Em alguns mapas, mudou apenas a organização textual; em outros, foram alterados cantos, paredes, bandeiras ou respawns, com potencial efeito na jogabilidade. `Larhi` é um exemplo de revisão geométrica significativa. Os comentários `; Created: ...` / `; Revised by Nosferatu: ...` nos TXT informam a origem da revisão, **sem substituir a autoria original** (`P author`).

`mapas_revisados.zip` contém **23 mapas**: **14** correspondentes a mapas nativos da V2 e **9** sem correspondente na pasta nativa examinada. Os **6 nativos restantes** devem continuar com suas versões atuais; qualquer um poderá ser revisado futuramente pelo painel. Nenhum outro conjunto de mapas deve ser importado nesta etapa.

Os campos de autoria declarados nos **arquivos mais recentes** de `mapas_revisados.zip` são a referência fornecida para a importação; em especial **Attack / Attack 2: `evilKaioh`** e **Cebs Park: `Outgun`**. Preservar separadamente os metadados da versão nativa histórica, mesmo quando diferentes.

## 4. Comportamento esperado do sistema

### 4.1. Uma identidade de mapa, múltiplas revisões imutáveis

- Criar **identidade estável do mapa** (ID interno, não baseada no título/nome de arquivo) e **revisões imutáveis** (ID próprio, texto exato/bytes, digest forte, CRC legado, data, moderador responsável, procedência e metadados do mapa).
- Distinguir **identidade do mapa**, **revisão ativa para novas partidas** e **revisões históricas**. Uma revisão antiga não precisa ser jogável nem aparecer na lista normal, mas precisa continuar recuperável pelos replays/registros a que estiver vinculada.
- Não apagar nem reescrever os IDs antigos (`larhi`, `mooca`, `pari2` etc.). Manter **aliases/associações históricas** para compatibilidade de URLs, partidas, replays, rotações e eventuais referências internas.
- Não associar automaticamente dois mapas apenas por título igual, capitalização semelhante ou sufixo numérico. `Attack` e `Attack 2`, por exemplo, são mapas distintos, **não revisões um do outro**. Usar associação **explícita** na importação e escolha expressa no formulário para novas revisões.
- A nomenclatura do TXT pode mudar de uma revisão para a seguinte sem mudar a identidade da família. O título **atual** vem de `P title`; títulos anteriores podem ser preservados como metadados históricos de suas revisões/partidas.

### 4.2. Interface simples de upload e manutenção

- Retirar o campo de texto livre **“Mapa”** do fluxo normal de upload. Ler `P title` e `P author` do TXT para exibir uma prévia. O identificador técnico fica interno e estável.
- No upload, oferecer escolha clara: **“Novo mapa”** ou **“Nova revisão de um mapa existente”** (selecionar mapa). Um título igual ou parecido pode disparar **aviso de possível duplicação**, mas nunca associar automaticamente nem impedir um homônimo legítimo.
- Mostrar uma **única entrada principal por identidade** no catálogo; revisões anteriores ficam acessíveis em **Histórico** ou filtro, não na lista principal. Um mapa nativo também pode ser retirado das novas rotações sem tornar a revisão histórica indisponível para replays.
- Disponibilizar **Baixar TXT** da revisão atual e de revisões anteriores, tanto de nativos quanto de mapas enviados por moderadores. Permitir a qualquer moderador **autorizado** enviar revisão de mapa criado ou enviado por outro, mantendo a autoria original e registrando quem publicou cada revisão; não criar aprovação obrigatória nem exclusividade por autor.
- Permitir **comparação visual antes de confirmar**, aproveitando o renderizador de miniatura, e **restaurar revisão anterior como nova revisão ativa** (sem apagar as intermediárias). Descrição do que mudou pode ser opcional.
- Prevenir sobrescrita acidental: confirmar revisão e exigir referência à versão sobre a qual o moderador começou a trabalhar (detectar publicação concorrente); não permitir duas alterações conflitantes sem aviso.
- As ações de ativar, desativar e selecionar revisões devem funcionar da mesma maneira para mapas originalmente nativos e os publicados via painel. **Desativar o uso futuro** não significa **apagar o conteúdo histórico**.

### 4.3. Replays e fidelidade das partidas

- Preservar **cópias imutáveis** de todos os mapas nativos que possam ser necessários a replays antigos. Antes da implantação, verificar se houve versões nativas anteriores à cópia presente no repositório: um replay legado sem mapa incorporado pode não revelar, sozinho, a geometria exata que foi usada.
- Fazer **todos os novos replays** incorporar a geometria exata da partida, **inclusive os mapas nativos**; registrar também a revisão/digest, mantendo suporte ao formato legado.
- Resolver **replays antigos sem mapa embutido** por identificador legado e versão histórica verificada. **Não substituir o asset legado pela revisão atual** nem declarar um replay “fiel” quando a versão original não puder ser comprovada. Se necessário, indicar limitação ao reproduzir.
- Corrigir o reprodutor para **não reutilizar geometria** quando dois replays seguidos têm a mesma identificação mas revisões/conteúdos diferentes. Verificar o CRC/digest e tratar incompatibilidade de modo visível, não apenas com aviso de console.
- **Miniaturas e páginas históricas** devem representar a geometria que existia na partida, não a revisão mais recente. Para partidas antigas sem associação comprovável, aplicar a política conservadora de recuperação ou mostrar a limitação explicitamente.
- Uma sala/partida em andamento deve continuar **presa à revisão com que começou**; nova publicação ou alteração da rotação só passa a valer no momento seguro definido pelo servidor (sem troca de paredes durante a partida).

### 4.4. Estatísticas, rankings e marcos

- Preservar **todos os resultados históricos**, participantes, equipes, placares, capturas, ratings/OpenSkill e demais estatísticas. Não recalcular ratings nem alterar placares por causa da migração.
- Nos filtros e contagens de “mapas distintos”, agregar partidas pela **identidade estável do mapa**, incluindo suas revisões historicamente vinculadas. Em geral, deve existir **uma entrada “Larhi”**, que reúne original e revisão FIOA.
- Manter a possibilidade de **analisar uma revisão isoladamente** quando a geometria ou a orientação das equipes tiver mudado. Uma vitória da equipe vermelha numa revisão com bases invertidas não deve ser interpretada automaticamente como vantagem do mesmo lado físico em outra revisão.
- Conciliar duplicações já introduzidas (por exemplo, `mooca` nativo e `Mooca` do teste) somente após verificar os registros, a intenção e os dados; não apagar partidas, replays ou revisões. Tornar a migração **idempotente** para evitar contar marcos duas vezes ou criar famílias duplicadas.

## 5. Inventário e importação inicial — executar tudo como uma operação planejada

O arquivo anexo `inventario_mapas.csv` contém os vínculos **propostos**, com títulos, autores declarados e tratamento. Validar os pares por inspeção do conteúdo **antes da execução**, porque identidade histórica não se deduz apenas do nome.

**`mapas_revisados.zip`**

- **14 revisões de nativos** (associação explícita no CSV): `2_versus_2`, `3x3`, `attack`, `cebs_park`, `fabiana_cecin`, `ipiranga`, `larhi`, `mooca`, `pari`, `pari_2`, `sisso`, `the_blunt_mini`, `the_cover_4`, `verde`.
- **9 mapas novos** no catálogo da V2 examinada: `attack_2`, `bauru`, `dyeh`, `gavea`, `luz`, `rocinha`, `the_small_ud`, `the_ud`, `vidigal`.
- **6 nativos sem revisão neste pacote:** `4x4`, `6_askelta`, `attack3`, `coliseu`, `lola`, `outgun1`. Permanecem como estão e devem poder receber revisões futuras.

**Rotações:** disponibilizar os mapas revisados para substituírem os nativos correspondentes nas futuras partidas **onde esses mapas já estiverem selecionados**. Preservar decisões de pool por modalidade; **não adicionar automaticamente todos os mapas ao Ranqueado**. Nenhuma revisão deve modificar partidas já em curso.

**Importação em lote:** como o Ozzy prefere tratar o pacote integralmente, criar um importador/migração **de uso controlado**, com modo de conferência (*dry run*), relatório de vínculos/colisões e transação ou operação recuperável. Não é necessário criar uma tela permanente de importação em massa. Após a migração, as revisões cotidianas deverão ser feitas integralmente pelo painel.

## 6. Testes de aceitação obrigatórios (cobrir toda a entrega)

1. **Replays históricos de nativos:** replay antigo de `Larhi` com cantos arredondados continua exibindo as paredes originais; seu relatório também. Se não houver replay real disponível, testar com fixture preservada e indicar a limitação.
2. **Substituição segura:** nova partida em `Larhi` usa a revisão FIOA de cantos retos; o nome público continua **Larhi** e existe uma única identidade nos filtros gerais.
3. **Replays futuros:** gravar/reproduzir partidas em nativo revisado e mapa enviado pela moderação; republicar outra revisão e demonstrar que os replays anteriores continuam exatos, inclusive após desativação.
4. **Replays consecutivos:** assistir duas revisões do mesmo mapa na mesma sessão sem reutilizar a geometria errada; divergência de CRC/digest deve ser detectada.
5. **Estatísticas:** demonstrar antes/depois, em base de teste, que partidas, participações, frags, capturas, ratings e leaderboards não são perdidos nem recalculados. Filtro Larhi agrega família; filtro de revisão separa; `mooca`/`Mooca` não contam duas identidades depois da conciliação aprovada.
6. **Autonomia:** moderador baixa TXT de nativo ou mapa de outro moderador, revisa, compara, publica, restaura revisão, desativa/ativa para novas partidas e consulta histórico sem solicitar deploy ao Ozzy.
7. **Compatibilidade:** URLs/IDs legados e rotações continuam resolvendo; os seis nativos não revisados continuam jogáveis; `Attack 2` não é confundido com revisão de `Attack`; novos mapas também podem receber revisões futuras.
8. **Concorrência e segurança:** mudanças simultâneas exigem confirmação; submissões inválidas não quebram o catálogo; backups e restauração são testados; reexecução da migração não duplica mapas/versões/conquistas.
9. **Carga e troca de rotação:** atualizar revisão durante uma partida não muda o mapa daquela partida; próxima partida recebe a revisão esperada. Verificar casos com salas, modo espectador e cache de miniaturas.
10. **Auditoria:** cada revisão mostra autor do mapa, publicador, data, proveniência e texto original; histórico antigo não é apagado por exclusão lógica.

**Falhas bloqueadoras:** replay que carrega geometria diferente sem aviso, partida histórica sem representação recuperável quando deveria existir, perda/duplicação de estatísticas, associação equivocada de mapas distintos, atualização de partida em andamento ou descarte de arquivo histórico sem backup e plano de reversão.

## 7. Plano técnico e precauções de implantação

1. **Inspecionar produção:** confirmar aderência do deploy ao snapshot `outgun-web-2`, migrations efetivamente aplicadas e assets/replays existentes. Os ZIPs enviados não provam o estado do servidor atual.
2. **Backup verificável:** banco, configuração/rotações, assets nativos, versões do painel e replays; testar restauração antes de alterar produção. Congelar as revisões necessárias a replays legados.
3. **Implementar uma vez:** identidade estável, revisões imutáveis, compatibilidade de identificadores, leitura unificada de `P title`, painel de revisão/download/histórico/restauração e atualização dos consumidores (partidas, replays, relatórios, estatísticas e marcos).
4. **Migrar com mapeamento explícito:** executar a tabela de correspondências, tratar colisões existentes e produzir relatório de tudo o que será vinculado, mantido e publicado; revisar dúvidas sem inventar associações. Garantir idempotência.
5. **Rodar a bateria completa de testes** em ambiente separado (usando Larhi como caso ilustrativo, mas cobrindo 14 vínculos, 9 novos mapas revisados e 6 nativos preservados). Verificar previews e autenticação/roles.
6. **Publicar de modo recuperável:** preservar backups e IDs históricos; manter plano de rollback de banco e aplicação. Registrar que revisões futuras são autoatendidas no painel, não por edição manual do repositório.

**Liberdade de implementação:** Claude pode escolher tabelas, APIs, UI e estratégia de migração mais adequadas ao código efetivo. O essencial é **cumprir os comportamentos observáveis e os testes acima**, com o menor acréscimo de complexidade razoável. Não criar editor gráfico no navegador, fluxo obrigatório de aprovação ou política de padronização geométrica que restrinja outros autores.

## 8. Referências do snapshot examinado

Repositório `outgun-web-2(1).zip`, sobretudo:

- `apps/api/src/routes/admin.ts` — publicação/atualização de mapas, desativação, listagem de versões e rotações.
- `apps/api/src/panel-maps.ts` — validação do TXT e do identificador.
- `apps/api/migrations/0033_panel_maps.up.sql` — armazenamento de mapas da moderação e versões.
- `apps/web/src/screens/AdminScreen.tsx` — campo “Mapa”, upload, prévia e ações da moderação.
- `apps/game-server/src/room.ts` — gravação de replay e `mapText`.
- `packages/protocol/src/replay.ts` — cabeçalho do replay.
- `apps/web/src/game/map-loader.ts` e `apps/web/src/game/replay-host.ts` — carregamento e reutilização de geometria.
- `apps/web/src/screens/MapPreview.tsx` / `MatchReport.tsx` — miniatura do mapa e relatório.
- `apps/api/src/style-radar.ts` / `packages/content/src/milestones.ts` — agrupamentos por identificador.
- `apps/api/migrations/0001_initial.up.sql` — vínculos de partidas e participantes.

**Nota:** parte das preocupações são **riscos derivados do código**, não bugs reproduzidos no ambiente real. O Claude deve validar cada caso com teste antes de alterar dados em produção. As correspondências de mapas estão explicitadas no CSV; não substituir a análise de geometria e metadados por correspondência textual automática.
