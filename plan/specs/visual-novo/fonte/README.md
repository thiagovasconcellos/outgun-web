# Fonte da proposta do visual novo

A página `../proposta.html` é gerada a partir daqui (artifact: https://claude.ai/artifact/UwBsWYZHUD333EZ57M4v67).

- `template.html`: página com a demo (Canvas 2D), o catálogo, as fontes, as fases e as perguntas P1..P15. Tem os marcadores `"__TEX__"` e `"__MAPS__"`.
- `export.mjs`: exporta salas, bandeiras e spawns dos mapas para `maps.json` (precisa de `@outgun/content` compilado: `pnpm --filter @outgun/content build`). A lista de mapas fica no próprio script.
- `build.py`: embute as texturas Grass/Ice/Metal (`apps/web/public/assets/graphics`) e o `maps.json` no template.

Regerar (a partir desta pasta):

    node export.mjs maps.json
    python3 build.py template.html maps.json ../proposta.html

Para republicar o artifact, publicar `../proposta.html` como `index.html` no mesmo slug (e2379b57-3d09-4d14-9357-80297654b114).
