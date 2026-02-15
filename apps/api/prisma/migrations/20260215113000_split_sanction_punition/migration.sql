DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'StudentLifeEventType'
      AND e.enumlabel = 'PUNITION'
  ) THEN
    ALTER TYPE "StudentLifeEventType" ADD VALUE 'PUNITION';
  END IF;
END $$;
