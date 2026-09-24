#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 24.04 EC2 instance.
# Usable as EC2 user-data, or run by hand after SSHing in.
#
#   bash scripts/ec2-bootstrap.sh
set -euo pipefail

echo "==> system packages"
sudo apt-get update -qq
sudo apt-get install -y -qq curl git unzip tmux

echo "==> node 22 (matches the toolchain the harness is built with)"
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi

echo "==> pnpm"
sudo corepack enable
corepack prepare pnpm@9.15.4 --activate

echo "==> aws cli (for pushing results to S3)"
if ! command -v aws >/dev/null; then
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/aws.zip
  unzip -q /tmp/aws.zip -d /tmp && sudo /tmp/aws/install --update
fi

echo "==> CPU governor to performance"
# Burstable/variable clocks add noise to every timing measurement. Harmless if
# the knob is absent on this instance type.
sudo apt-get install -y -qq linux-tools-common linux-tools-generic 2>/dev/null || true
sudo cpupower frequency-set -g performance 2>/dev/null || echo "   (governor not settable here — fine)"

echo "==> workspace deps + chromium"
cd "$(dirname "$0")/.."
pnpm install --frozen-lockfile
pnpm build:harness
# --with-deps pulls the shared libraries headless chromium needs on a bare VM.
pnpm --filter @consentbench/harness exec playwright install --with-deps chromium

echo ""
echo "Ready. Versions:"
echo "  node     $(node -v)"
echo "  pnpm     $(pnpm -v)"
echo "  chromium $(pnpm --filter @consentbench/harness exec playwright --version 2>/dev/null || echo '?')"
