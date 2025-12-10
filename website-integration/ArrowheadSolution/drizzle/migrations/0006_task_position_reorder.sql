ALTER TABLE "tasks" ADD COLUMN "position" integer NOT NULL DEFAULT 0;

UPDATE "tasks" t
SET "position" = sub.rn - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY objective_id ORDER BY created_at) AS rn
  FROM "tasks"
) AS sub
WHERE sub.id = t.id;
