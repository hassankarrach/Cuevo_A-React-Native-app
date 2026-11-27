# Local development demo accounts

These persistent demo accounts are only for a local development database. The
passwords are public examples: never use them in production, on a shared
server, or for a real account. Do not expose a development API or database to
the public internet.

From `backend/`, after configuring `.env` for `ENVIRONMENT=development` and a
local PostgreSQL database named `cuevo_dev`, apply migrations and run:

```bash
alembic upgrade head
python -m app.dev_seed
```

The command is never run automatically at startup or during migrations. It
fails closed unless the environment is `development`, the database host is a
loopback address, and the database name is exactly `cuevo_dev`. For each absent
reserved email, it creates an account and profile in one transaction using
the existing Argon2 password hasher. Email is pre-verified, no verification
challenge or email is sent, and onboarding remains incomplete until the
profile-completion route is explicitly called.

| Email | Password | Profile |
|---|---|---|
| `alex.demo@example.com` | `CuevoDemo-Alex-2026!` | Alex Demo (`alex_demo`) |
| `jamie.demo@example.com` | `CuevoDemo-Jamie-2026!` | Jamie Demo (`jamie_demo`) |

If either reserved email is already present, the command skips it without
changing the account, password, verification state, or profile. Rerunning the
command is safe and does not reset passwords, overwrite profile edits, delete
records, or clean other database contents. If another record (for example, a
username) conflicts during creation, the whole transaction fails rather than
partially seeding accounts.

The command also adds three catalog records from the approved static
`backend/data/songs.json` artifact, using opaque deterministic internal IDs.
Existing catalog rows and their metadata are never overwritten. The full
approved 40-record metadata artifact can be imported separately with
`python -m app.catalog.importer`; this command uses the same local-development
database guard and is additive. Neither command runs in migrations or
production. The stable catalog IDs are documented in [the song catalog
contract](../data/SONG_CATALOG.md).

The same command now creates one public `Cuevo Demo Mix`, owned by Alex Demo
with Jamie Demo as an accepted collaborator. Its entries use only the three
approved catalog IDs. The playlist, accepted invitation, entries and initial
event use stable seed-owned IDs; a marker makes reruns skip an existing sample
without resetting names, entry order or other user edits. A conflicting stable
ID fails without deleting or overwriting anything.

Playlists are seeded only after demo accounts and the approved three-song
catalog fixture exist. This is the existing `python -m app.dev_seed` command,
not a competing seed tool. It still fails closed outside development on a
loopback `cuevo_dev` database. It is never invoked by application startup,
production, or migrations. See the [playlist API contract](./playlists.md) for
the fixture's permissions and resource behavior. No room records are seeded.
