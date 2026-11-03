-- Run once with the managed-video schema migration role before deploying the
-- Vertex worker. Do not run as the application runtime account.
-- Keep managed_credentials rows: already queued Gemini API jobs may reference
-- them by managed_jobs.credential_id until those jobs reach a terminal state.
ALTER TABLE managed_jobs ALTER COLUMN credential_id DROP NOT NULL;

-- Move new work to Vertex only after deployment is configured; leave the paid
-- generation switch off until a separately approved pilot is accepted.
UPDATE managed_provider
SET config = (config - 'credential') || jsonb_build_object(
  'enabled', false,
  'provider', 'vertex',
  'model', 'gemini-omni-1.1-flash'
), updated_at = now()
WHERE id = 1;
