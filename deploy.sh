#!/usr/bin/env bash
# Pull, install, build and restart this service on the VPS. Run as root:
#   cd /var/www/aijobpilot/admin-frontend && bash deploy.sh
exec bash "$(dirname "$(readlink -f "$0")")/../packages/scripts/deploy-service.sh" admin-frontend "$@"
