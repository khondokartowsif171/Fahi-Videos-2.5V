CREATE TABLE IF NOT EXISTS studio_projects (
 id uuid PRIMARY KEY, tenant text NOT NULL, kind text NOT NULL CHECK(kind IN ('editor','aura','kotha','thumbnail')),
 title text NOT NULL, document jsonb NOT NULL, revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant,id)
);
CREATE INDEX IF NOT EXISTS studio_projects_tenant ON studio_projects(tenant,updated_at DESC);
CREATE TABLE IF NOT EXISTS studio_assets (
 id uuid PRIMARY KEY, tenant text NOT NULL, name text NOT NULL, mime text NOT NULL,
 bytes bigint NOT NULL CHECK(bytes>0), status text NOT NULL CHECK(status IN ('uploading','ready')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant,id)
);
CREATE TABLE IF NOT EXISTS studio_keys (
 tenant text PRIMARY KEY, encrypted_key text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS studio_jobs (
 id uuid PRIMARY KEY, tenant text NOT NULL, operation text, request_id text,
 request_hash text, state text NOT NULL DEFAULT 'started', result jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant,request_id)
);
-- Run as the migration account. The runtime role receives only DML, not DDL.
