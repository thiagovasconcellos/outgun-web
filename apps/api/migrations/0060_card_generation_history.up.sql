-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-581 (D-94, P10): gerações com a data de início e a história de cada era, pela cronologia
-- enviada pelo PO (as gerações marcam eras e reinícios, não a data da primeira partida).
ALTER TABLE card_generations ADD COLUMN started_on date;
ALTER TABLE card_generations ADD COLUMN story text NOT NULL DEFAULT '';
UPDATE card_generations SET started_on = '2002-04-06', description = 'Outgun 0.5',
  story = 'Em 06/04/2002 Fabio "Spinal" lança e apresenta o Outgun ao público, ainda na versão 0.37 beta. A data marca o nascimento do jogo e o início da sua primeira era: os itens, os primeiros clãs e as rivalidades que fundaram a comunidade.'
  WHERE ord = 1;
UPDATE card_generations SET started_on = '2004-04-19', description = 'Outgun 1.0',
  story = 'Em 19/04/2004 aparece o registro do "Outgun 1.0.0 in beta testing": uma nova fase do projeto, sob o desenvolvimento dos finlandeses Nix e Huntta, que já trabalhavam com o código desde 2003. Em 25/01/2005 sai a versão estável 1.0.0, resultado dessa evolução.'
  WHERE ord = 2;
UPDATE card_generations SET started_on = '2016-11-21', description = 'Outgun hospedado por jogadores',
  story = 'Em 21/11/2016 começa a retomada documentada do Outgun: Coiote entra em contato com Spinal para recuperar antigos jogadores e reorganizar a comunidade. No dia seguinte Ratod1 cria o grupo no Facebook e, em 25/11/2016, Migor cria o grupo no WhatsApp, as bases da terceira geração e da era profissional.'
  WHERE ord = 3;
UPDATE card_generations SET description = 'Outgun Web',
  story = 'O Outgun volta como jogo web e na Steam, com contas, ranking, clãs, OutCup e as Cartas de Jogador.'
  WHERE ord = 4;
