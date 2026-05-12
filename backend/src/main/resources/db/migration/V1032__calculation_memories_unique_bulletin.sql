-- calculation_memories tinha só índice em bulletin_id (V198), permitindo várias linhas por boletim.
-- Isso viola o mapeamento @OneToOne em MeasurementBulletin e causa:
-- HibernateException: Duplicate row was found and `ASSERT` was specified (ex.: DELETE /measurements/{id}).

DELETE FROM calculation_memories cm
WHERE EXISTS (
    SELECT 1
    FROM calculation_memories other
    WHERE other.bulletin_id = cm.bulletin_id
      AND other.ctid < cm.ctid
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_calculation_memories_bulletin_id
    ON calculation_memories (bulletin_id);
