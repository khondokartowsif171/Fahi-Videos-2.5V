CREATE TABLE IF NOT EXISTS managed_provider (
 id integer PRIMARY KEY CHECK(id=1), config jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS managed_credentials (
 id uuid PRIMARY KEY, encrypted_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), retired boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS managed_policies (
 id uuid PRIMARY KEY, scope text NOT NULL, config jsonb NOT NULL, next_cycle boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), actor text NOT NULL
);
CREATE INDEX IF NOT EXISTS managed_policy_scope ON managed_policies(scope,created_at DESC);
CREATE TABLE IF NOT EXISTS managed_grants (
 id uuid PRIMARY KEY, tenant text NOT NULL, cycle text NOT NULL, amount integer NOT NULL CHECK(amount>0), actor text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS managed_jobs (
 id uuid PRIMARY KEY, tenant text NOT NULL, actor text NOT NULL, cycle text NOT NULL, request_id uuid NOT NULL, request_hash text NOT NULL,
 state text NOT NULL DEFAULT 'queued', input jsonb NOT NULL, policy jsonb NOT NULL, credential_id uuid REFERENCES managed_credentials(id),
 reserve_usd numeric NOT NULL, cost_usd numeric NOT NULL DEFAULT 0, usage jsonb NOT NULL DEFAULT '[]', reserved_bytes bigint NOT NULL,
 asset_id uuid, error text, cancel_requested boolean NOT NULL DEFAULT false, lease_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant,request_id)
);
-- New Vertex jobs use the Coolify workload identity, while existing in-flight
-- Gemini API jobs retain their credential reference for backwards processing.
ALTER TABLE managed_jobs ALTER COLUMN credential_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS managed_jobs_queue ON managed_jobs(state,created_at);
CREATE TABLE IF NOT EXISTS managed_attempts (
 job_id uuid NOT NULL REFERENCES managed_jobs(id), shot integer NOT NULL, state text NOT NULL DEFAULT 'prepared', interaction_id text,
 response jsonb, error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(job_id,shot)
);
CREATE TABLE IF NOT EXISTS managed_audit (
 id uuid PRIMARY KEY, actor text NOT NULL, action text NOT NULL, detail jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
