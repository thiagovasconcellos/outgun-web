#!/bin/bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Prepara a máquina de um servidor satélite (OG-599), como root: Docker, firewall (22/80/443),
# atualizações automáticas de segurança e swap. Serve para Ubuntu/Debian e Oracle Linux 9. Idempotente:
# o deploy-satellite.sh roda a cada deploy, antes de enviar a imagem.
set -euo pipefail
# shellcheck disable=SC1091
. /etc/os-release
case " ${ID:-} ${ID_LIKE:-} " in
  *" debian "*) family=debian ;;
  *" fedora "* | *" rhel "*) family=rhel ;;
  *) echo "sistema não suportado: ${PRETTY_NAME:-desconhecido} (use Ubuntu, Debian ou Oracle Linux)" >&2; exit 1 ;;
esac

# swap antes dos pacotes: numa máquina de 1 GB o próprio dnf pode ficar sem memória
if ! swapon --show | grep -q /swapfile && [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile
  # com SELinux ligado, o swapon só aceita arquivo com este tipo
  if command -v selinuxenabled >/dev/null && selinuxenabled; then chcon -t swapfile_t /swapfile; fi
  mkswap /swapfile >/dev/null && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

machine_debian() {
  local pkgs=""
  command -v docker >/dev/null && docker compose version >/dev/null 2>&1 || pkgs="docker.io docker-compose-v2"
  command -v ufw >/dev/null || pkgs="$pkgs ufw"
  dpkg -s unattended-upgrades >/dev/null 2>&1 || pkgs="$pkgs unattended-upgrades"
  if [ -n "$pkgs" ]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -q
    # shellcheck disable=SC2086
    apt-get install -yq $pkgs
  fi
  # imagens Ubuntu da Oracle Cloud: regras de iptables que rejeitam tudo menos o SSH; quem cuida é o ufw
  if dpkg -s netfilter-persistent >/dev/null 2>&1; then
    DEBIAN_FRONTEND=noninteractive apt-get purge -yq iptables-persistent netfilter-persistent
    while iptables -D INPUT -j REJECT --reject-with icmp-host-prohibited 2>/dev/null; do :; done
    while iptables -D FORWARD -j REJECT --reject-with icmp-host-prohibited 2>/dev/null; do :; done
  fi
  if ! ufw status | grep -q "Status: active"; then
    ufw default deny incoming && ufw default allow outgoing
    ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
    ufw --force enable
  fi
}

machine_rhel() {
  # o Oracle Linux reserva 448 MB para o kernel de crash: quase metade de uma máquina de 1 GB.
  # Vale depois de reiniciar.
  if grep -q crashkernel= /proc/cmdline && [ "$(awk '/^MemTotal/ { print $2 }' /proc/meminfo)" -lt 2097152 ]; then
    grubby --update-kernel=ALL --remove-args=crashkernel
    sed -i 's/^auto_reset_crashkernel yes/auto_reset_crashkernel no/' /etc/kdump.conf
    systemctl disable --now kdump
    echo "aviso: reinicie a máquina uma vez para liberar a memória do kernel de crash"
  fi
  if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
    # o Oracle Linux não traz Docker: o pacote vem do repositório oficial, para RHEL
    curl -fsSL https://download.docker.com/linux/rhel/docker-ce.repo -o /etc/yum.repos.d/docker-ce.repo
    dnf install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
  fi
  rpm -q dnf-automatic >/dev/null 2>&1 || dnf install -y -q dnf-automatic
  sed -i -e 's/^upgrade_type *=.*/upgrade_type = security/' -e 's/^apply_updates *=.*/apply_updates = yes/' /etc/dnf/automatic.conf
  systemctl enable --now dnf-automatic.timer
  # o índice de pacotes do Oracle Linux tem 189 MB e o dnf passa de 600 MB ao lê-lo: em 2026-11-10 o
  # dnf-makecache travou a máquina de 1 GB por quase 6 h (OG-601). Sem ele, o dnf-automatic já baixa
  # o índice uma vez por dia; e fica com teto de memória, para o aperto ser só dele.
  systemctl disable --now dnf-makecache.timer 2>/dev/null || true
  mkdir -p /etc/systemd/system/dnf-automatic.service.d
  cat > /etc/systemd/system/dnf-automatic.service.d/outgun-memory.conf <<'UNIT'
[Service]
MemoryHigh=350M
MemoryMax=450M
MemorySwapMax=1500M
Nice=19
IOSchedulingClass=idle
UNIT
  systemctl daemon-reload
  # firewall antes do Docker subir: um reload depois apagaria as regras dele
  systemctl enable --now firewalld
  if ! firewall-cmd --permanent --query-service=http >/dev/null || ! firewall-cmd --permanent --query-service=https >/dev/null; then
    firewall-cmd -q --permanent --add-service=http --add-service=https
    firewall-cmd -q --reload
  fi
}

"machine_$family"
systemctl enable --now docker
