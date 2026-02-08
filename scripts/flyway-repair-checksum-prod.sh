#!/bin/bash
# Script para corrigir checksum mismatch do Flyway no banco PROD
# As migrações V424 e V427 foram alteradas (PRIMARY KEY fix) - o Flyway reclama do checksum.
#
# Execute NO SERVIDOR (SSH):
#   cd /var/www/secured_guard/prod
#   docker exec -i secured-guard-db-prod psql -U postgres -d secured_guard -c "
#     UPDATE flyway_schema_history SET checksum = 318441356 WHERE version = '424';
#     UPDATE flyway_schema_history SET checksum = -1437677079 WHERE version = '427';
#   "
#   docker restart secured-guard-backend-prod
#
# Ou use variáveis se o seu setup for diferente:
#   POSTGRES_CONTAINER=secured-guard-db-prod POSTGRES_USER=postgres POSTGRES_DB=secured_guard ./scripts/flyway-repair-checksum-prod.sh

set -e
CONTAINER="${POSTGRES_CONTAINER:-secured-guard-db-prod}"
USER="${POSTGRES_USER:-postgres}"
DB="${POSTGRES_DB:-secured_guard}"

echo "🔧 Reparando checksums do Flyway (V424, V427) no banco PROD..."
echo "   Container: $CONTAINER | User: $USER | DB: $DB"

docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB" -c "
UPDATE flyway_schema_history SET checksum = 318441356 WHERE version = '424';
UPDATE flyway_schema_history SET checksum = -1437677079 WHERE version = '427';
SELECT version, description, checksum, success FROM flyway_schema_history WHERE version IN ('424','427');
"

echo "✅ Checksums atualizados! Reinicie o backend prod:"
echo "   docker restart secured-guard-backend-prod"
