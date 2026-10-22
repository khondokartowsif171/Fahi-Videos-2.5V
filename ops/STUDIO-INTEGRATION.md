# Aura embedded FahiVids

Standalone builds retain their original root URL. `FAHI_EMBEDDED=1` builds for `/fahi-studio`, with authenticated requests through the Aura gateway. Never expose the Studio container directly. Public standalone FahiVids is a separate deployment.

The gateway image reuses the exact current Client image's actor/workspace resolution. It has no customer-send workers. Update its pinned base only after comparing the deployed Client revision. The original Meta connector and old `/studio` routes are untouched.

Configure private server environment files under `/opt/fahi-studio-preview/`: bridge secret (at least 32 characters), independent Studio vault secret, restricted Studio PostgreSQL URL, and gateway's existing Aura identity connection. No credentials belong in this repository. Run `ops/studio-schema.sql` using the migration account, grant DML only to `aura_fahi_runtime`, and keep schema creation unavailable to the runtime role.

Start with `FAHI_RELEASE_MODE=preview`: only platform owner/admin can enter. In `live` mode, verified client owners and their workspace members are supported. `/fahi-preview` provides a preview shell; `/fahi-studio/` is the embedded application. Provider keys are tenant-specific Gemini BYOK. Calling, automation, ElevenLabs and legacy Gemini video endpoints are blocked in embedded mode.

Cloud media: private persistent `/media`, 250 MiB/file, 1 GiB/workspace, 10 GiB total, 10 GiB disk reserve. PostgreSQL stores project revisions, keys and render ownership. Interrupted uploads remove partial files and reservations. Range downloads remain authenticated. Existing GT billing entitlements are not changed.

Before replacing the dashboard menu, verify identity isolation, cross-browser project/media reopen, provider errors, and actual video/image/audio artifacts. Keep the old Studio and recorded Client image for menu rollback. Do not restore old customer databases as a rollback.

Tests: `npm run typecheck`, `npm run test:editor`, `npm run test:aura`, `npm run test:kotha`, `node tests/studio-context.cjs`. Provider tests mock responses and do not prove paid generation or speech quality. Real provider tests require an explicit input and an authorized workspace key.
