#!/usr/bin/env bash
# Nasazení webu Signery na Cloudflare Pages.
#
#   ./nasadit.sh            → produkční nasazení (větev main)
#   ./nasadit.sh nahled     → náhled na dočasné adrese, produkce se nemění
#
# Do Cloudflare jde jen to, co má být veřejné. Interní podklady
# (README, STRATEGIE, logo manuál, Fotky, varianta B) zůstávají v repozitáři.

set -euo pipefail

PROJEKT="signery"
KOREN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VETEV="main"
[ "${1:-}" = "nahled" ] && VETEV="nahled"

DIST="$(mktemp -d)"
trap 'rm -rf "$DIST"' EXIT

# ─── Co se nahrává ────────────────────────────────────────────────────
cp "$KOREN"/*.html          "$DIST"/
cp -R "$KOREN"/assets       "$DIST"/
cp "$KOREN"/_headers        "$DIST"/
[ -f "$KOREN/robots.txt" ]  && cp "$KOREN/robots.txt"  "$DIST"/
[ -f "$KOREN/llms.txt" ]    && cp "$KOREN/llms.txt"    "$DIST"/
[ -f "$KOREN/sitemap.xml" ] && cp "$KOREN/sitemap.xml" "$DIST"/
[ -f "$KOREN/_redirects" ]  && cp "$KOREN/_redirects"  "$DIST"/

# Manuál značky je interní podklad — kdyby se do kořene někdy vrátil.
rm -f "$DIST"/Manuál*.html
find "$DIST" -name '.DS_Store' -delete

echo "Nahrávám $(find "$DIST" -type f | wc -l | tr -d ' ') souborů ($(du -sh "$DIST" | cut -f1)) do větve $VETEV…"

npx wrangler pages deploy "$DIST" \
  --project-name "$PROJEKT" \
  --branch "$VETEV" \
  --commit-dirty=true
