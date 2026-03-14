-- Optional PostgreSQL optimizations for search-heavy workloads.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes accelerate ILIKE '%keyword%' searches.
CREATE INDEX IF NOT EXISTS idx_contact_fullname_trgm
  ON "Contact" USING gin ("fullName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contact_email_trgm
  ON "Contact" USING gin ("email" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contact_phonenumber_trgm
  ON "Contact" USING gin ("phoneNumber" gin_trgm_ops);

-- Composite indexes to support user-scoped filtering and sorting.
CREATE INDEX IF NOT EXISTS idx_contact_user_createdat
  ON "Contact" ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_contact_user_fullname
  ON "Contact" ("userId", "fullName");

CREATE INDEX IF NOT EXISTS idx_contact_user_email
  ON "Contact" ("userId", "email");

CREATE INDEX IF NOT EXISTS idx_contact_user_phone
  ON "Contact" ("userId", "phoneNumber");
