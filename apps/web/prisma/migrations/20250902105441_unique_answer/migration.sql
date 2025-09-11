-- Add unique constraint on (sessionId, questionKey)
DO $$ BEGIN
    ALTER TABLE "Answer"
    ADD CONSTRAINT "Answer_sessionId_questionKey_key" UNIQUE ("sessionId", "questionKey");
EXCEPTION
    WHEN duplicate_table THEN RAISE NOTICE 'Constraint already exists, skipping';
    WHEN duplicate_object THEN RAISE NOTICE 'Constraint already exists, skipping';
END $$;
