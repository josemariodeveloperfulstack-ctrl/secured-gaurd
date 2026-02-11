#!/bin/bash
# Script para corrigir checksum mismatch do Flyway no banco PROD
# Migrações V424, V427 e V429 - checksums alinhados aos ficheiros atuais.
#
# Execute NO SERVIDOR (SSH):
#   docker exec -i secured-guard-db-prod psql -U postgres -d secured_guard_prod -c "
#     UPDATE flyway_schema_history SET checksum = 318441356 WHERE version = '424';
#     UPDATE flyway_schema_history SET checksum = -1437677079 WHERE version = '427';
#     UPDATE flyway_schema_history SET checksum = -1673547286 WHERE version = '429';
#   "
#   docker restart secured-guard-backend-prod
#
# Ou: POSTGRES_CONTAINER=secured-guard-db-prod POSTGRES_USER=postgres POSTGRES_DB=secured_guard_prod ./scripts/flyway-repair-checksum-prod.sh

set -e
CONTAINER="${POSTGRES_CONTAINER:-secured-guard-db-prod}"
USER="${POSTGRES_USER:-postgres}"
DB="${POSTGRES_DB:-secured_guard_prod}"

echo "🔧 Reparando checksums do Flyway (V424, V427, V429) no banco PROD..."
echo "   Container: $CONTAINER | User: $USER | DB: $DB"

docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB" -c "
UPDATE flyway_schema_history SET checksum = 318441356 WHERE version = '424';
UPDATE flyway_schema_history SET checksum = -1437677079 WHERE version = '427';
UPDATE flyway_schema_history SET checksum = -1673547286 WHERE version = '429';
SELECT version, description, checksum, success FROM flyway_schema_history WHERE version IN ('424','427','429') ORDER BY version;
"

echo "✅ Checksums atualizados! Reinicie o backend prod:"
echo "   docker restart secured-guard-backend-prod"
