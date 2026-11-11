// SPDX-License-Identifier: GPL-2.0-or-later
// Hook afterPack do electron-builder (OG-604). No Linux, o executável `outgun` vira um script que
// chama o binário de verdade (`outgun-bin`) e acrescenta `--no-sandbox` quando o sandbox de processo
// do Chromium não tem como subir: a Steam não instala o `chrome-sandbox` com setuid e o Ubuntu 24.04
// bloqueia user namespaces sem ele, então o app morria no arranque, sem janela. Assim o app não
// depende da opção de inicialização em Steamworks. A janela só abre o site do jogo, e o
// `sandbox: true` do renderer e a navegação restrita (main.js) continuam valendo.
import fs from 'node:fs';
import path from 'node:path';

const REAL_SUFFIX = '-bin';

/** Texto do script que fica no lugar do executável. */
export function launcherScript(realName) {
  return `#!/bin/sh
# Gerado por apps/desktop/after-pack.mjs (OG-604). Não edite: muda a cada build.
here="$(dirname "$(readlink -f "$0")")"

# O sandbox do Chromium precisa do chrome-sandbox com setuid de root ou de user namespaces liberados.
sandbox_ok() {
  # aberto pela Steam: a pasta do jogo nunca tem setuid, e o contêiner dela varia de máquina para máquina
  [ -n "\${SteamAppId:-}\${SteamGameId:-}" ] && return 1
  [ -u "$here/chrome-sandbox" ] && [ "$(stat -c %u "$here/chrome-sandbox" 2>/dev/null)" = "0" ] && return 0
  command -v unshare >/dev/null 2>&1 && unshare --user true >/dev/null 2>&1
}

if sandbox_ok; then
  exec "$here/${realName}" "$@"
fi
exec "$here/${realName}" --no-sandbox "$@"
`;
}

/** Troca o executável pelo script. Idempotente: rodar de novo só regrava o script. */
export function installLauncher(appOutDir, executableName) {
  const launcher = path.join(appOutDir, executableName);
  const realName = executableName + REAL_SUFFIX;
  const real = path.join(appOutDir, realName);
  if (!fs.existsSync(real)) fs.renameSync(launcher, real);
  fs.writeFileSync(launcher, launcherScript(realName), { mode: 0o755 });
  fs.chmodSync(launcher, 0o755);
  fs.chmodSync(real, 0o755);
  return { launcher, real };
}

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') return;
  installLauncher(context.appOutDir, context.packager.executableName);
}
