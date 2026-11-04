# OG-557 — Painel: novo mapa ou nova revisão, sem campo de nome

| Campo | Valor |
|---|---|
| Épico | E17 |
| Tipo | Feature |
| Prioridade | Must |
| Estimativa | 3 pts |
| Sprint | S60 |
| Status | Concluído |
| Dependências | OG-552 |
| Regras de negócio | RN-MRV-01, RN-MRV-07, RN-MRV-08 |
| Skills | `outgun-card-workflow` |

> Origem: proposta de Nosferatu (arquiteto de mapas da comunidade), 2026-11-02 — cópia em `plan/specs/mapas-revisoes/`. Decisão D-91.

## História
Como moderador, quero subir um TXT e escolher se é um mapa novo ou uma revisão de um mapa existente (meu, de outro moderador ou nativo), sem inventar nome técnico.

## Contexto
- Hoje o painel pede um campo "Mapa" (nome livre, case-sensitive: permitiu `Mooca` ao lado do nativo `mooca`; `Pari2` × `P title Pari 2`). Só mapas da moderação aceitam versão nova.

## Escopo
- Upload sem campo de nome: prévia lê `P title`/`P author`, tamanho, CRC e erros do parser (RN-MAP-05).
- Escolha explícita: **Novo mapa** ou **Nova revisão de…** (lista de todos os mapas, nativos inclusive). Título igual/parecido (sem caixa, acentos, espaços, sufixo numérico) mostra aviso de possível duplicação, sem bloquear nem associar sozinho.
- Revisão exige a revisão-base em que o moderador trabalhou; se outra foi publicada depois, 409 com "fulano publicou a rev N às HH:MM — compare antes de publicar".
- Arquivo em UTF-8 com acento é convertido para Latin-1 com aviso (achado: `gavea.txt` do pacote sai como "GÃ¡vea" lido como Latin-1); caractere fora do Latin-1 continua recusado.
- Nota da revisão opcional; auditoria grava autor do mapa, publicador, revisão-base e SHA-256.
- Quem publica (P1, comunidade 2026-11-02): qualquer moderador; sem aprovação obrigatória (D-70).
- Título exibido (P2): sempre o `P title` da revisão ativa, em todo o jogo.

## Critérios de aceite
- [x] Moderador publica revisão de um nativo e de um mapa de outro moderador; a autoria (`P author`) fica a do arquivo e o publicador fica registrado.
- [x] Duas publicações concorrentes sobre a mesma base: a segunda recebe o conflito.
- [x] Subir "Attack 2" não vira revisão de "Attack" (só aviso).

## Notas de implementação
- Rotas novas: `POST /admin/maps` (mapa novo; chave sai do `P title`, única sem caixa, " 2" se repetir) e `POST /admin/maps/:key/revisions` (exige `baseRevision`; 409 `newer_revision` com quem/quando se a ativa não é a base, `force` para publicar mesmo assim). `/admin/maps/check` sem nome, com prévia, SHA-256 e aviso de título parecido (`titleKey`: sem caixa/acentos/espaços/parênteses/sufixo numérico). Rotas antigas `PUT/DELETE /admin/maps/:name` saíram; `panel_maps` só leitura.
- UTF-8: o painel já decodificava UTF-8 válido; agora avisa que converteu para Latin-1. Auditoria grava mapa, revisão, base, SHA-256 e autor.
- Rotações validam pelo catálogo (`playableMaps`), com a pasta dos servidores de reserva se a semente ainda não rodou.
