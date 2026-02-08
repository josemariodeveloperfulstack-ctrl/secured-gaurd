#!/bin/bash
# Script para corrigir checksum mismatch do Flyway no banco CI
# Execute NO SERVIDOR (SSH):
#
#   cd /var/www/secured_guard/ci
#   docker exec -i secured-guard-db-ci psql -U secured_guard_ci -d secured_guard_ci -c "
#     UPDATE flyway_schema_history SET checksum = 318441356 WHERE version = '424';
#     UPDATE flyway_schema_history SET checksum = -1437677079 WHERE version = '427';
#   "
#   docker restart secured-guard-backend-ci
#

set -e
CONTAINER="${POSTGRES_CONTAINER:-secured-guard-db-ci}"
USER="${POSTGRES_USER:-secured_guard_ci}"
DB="${POSTGRES_DB:-secured_guard_ci}"

echo "🔧 Reparando checksums do Flyway (V424, V427) no banco CI..."
echo "   Container: $CONTAINER | User: $USER | DB: $DB"

docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB" -c "
UPDATE flyway_schema_history SET checksum = 318441356 WHERE version = '424';
UPDATE flyway_schema_history SET checksum = -1437677079 WHERE version = '427';
SELECT version, description, checksum, success FROM flyway_schema_history WHERE version IN ('424','427');
"

echo "✅ Checksums atualizados! Reinicie o backend CI:"
echo "   docker restart secured-guard-backend-ci"
