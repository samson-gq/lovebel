# CI: Authenticated integration tests

Some integration tests (e.g. `src/lib/searchProfiles.integration.test.ts`)
hit the live Supabase RPCs (`search_profiles`, `count_search_profiles`) and
therefore require a signed-in user. They **automatically skip** when no
credentials are provided, so local `bunx vitest run` works out of the box.

To actually execute those assertions in CI, expose two environment variables
to the test step:

| Variable                  | Description                                      |
| ------------------------- | ------------------------------------------------ |
| `TEST_SUPABASE_EMAIL`     | Email of a real test user in your Lovable Cloud  |
| `TEST_SUPABASE_PASSWORD`  | That user's password                             |

> Create a dedicated, low-privilege test account — never reuse a real user.
> The account only needs to be able to sign in; no admin role is required.

## 1. Create a test user

In the app, sign up once with an email like `ci-tests@example.com`. Because
auto-confirm email is enabled, the account is immediately usable.

## 2. Store credentials as CI secrets

### GitHub Actions

Repository → **Settings → Secrets and variables → Actions → New repository secret**:

- `TEST_SUPABASE_EMAIL`
- `TEST_SUPABASE_PASSWORD`

Then in your workflow:

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - name: Seed test user
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          TEST_SUPABASE_EMAIL: ${{ secrets.TEST_SUPABASE_EMAIL }}
          TEST_SUPABASE_PASSWORD: ${{ secrets.TEST_SUPABASE_PASSWORD }}
        run: bun run test:seed
      - name: Run tests
        env:
          TEST_SUPABASE_EMAIL: ${{ secrets.TEST_SUPABASE_EMAIL }}
          TEST_SUPABASE_PASSWORD: ${{ secrets.TEST_SUPABASE_PASSWORD }}
        run: bunx vitest run
```

> The seed step is idempotent: it creates the user on first run and just
> resets the password / refreshes the profile on subsequent runs. See
> [Seeding the test user](#seeding-the-test-user) below for details.

### GitLab CI

Project → **Settings → CI/CD → Variables** (mark secrets as *Masked* and *Protected*).

```yaml
test:
  image: oven/bun:1
  script:
    - bun install --frozen-lockfile
    - bun run test:seed
    - bunx vitest run
  variables:
    SUPABASE_URL: $SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY: $SUPABASE_SERVICE_ROLE_KEY
    SUPABASE_ANON_KEY: $SUPABASE_ANON_KEY
    TEST_SUPABASE_EMAIL: $TEST_SUPABASE_EMAIL
    TEST_SUPABASE_PASSWORD: $TEST_SUPABASE_PASSWORD
```

### Local one-off run

```bash
# Create / refresh the test user once
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY='...' \
TEST_SUPABASE_EMAIL=ci-tests@example.com \
TEST_SUPABASE_PASSWORD='your-password' \
bun run test:seed

# Then run the integration tests
TEST_SUPABASE_EMAIL=ci-tests@example.com \
TEST_SUPABASE_PASSWORD='your-password' \
bunx vitest run src/lib/searchProfiles.integration.test.ts
```

## Seeding the test user

`scripts/seed-test-user.mjs` (run via `bun run test:seed`) makes sure the
account expected by the integration tests exists and is usable. It:

1. Looks up the user by `TEST_SUPABASE_EMAIL` using the service role key.
2. Creates the user if missing (with `email_confirm: true` so they can sign in).
3. Otherwise resets the password to `TEST_SUPABASE_PASSWORD` (handy if a teammate rotated it locally).
4. Upserts a matching row in `public.profiles` so RLS-protected RPCs return data.
5. Optionally signs in once with `SUPABASE_ANON_KEY` to verify credentials end-to-end.

Required env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`TEST_SUPABASE_EMAIL`, `TEST_SUPABASE_PASSWORD`.
Optional: `SUPABASE_ANON_KEY` (for the login check),
`TEST_PROFILE_NAME`, `TEST_PROFILE_CITY`, `TEST_PROFILE_AGE`, `TEST_PROFILE_GENDER`.

The script is idempotent — running it on every CI build is safe and cheap.


## 3. Verify

Without the env vars you should see assertions reported as **skipped**:

```
✓ src/lib/searchProfiles.integration.test.ts (6 tests | 5 skipped)
```

With the env vars set, the same suite should run all 6 tests and pass.

## Troubleshooting

- **All tests still skip in CI** → secrets aren't reaching the step. Confirm
  the `env:` block is on the same job step that runs `vitest`.
- **`Invalid login credentials`** → the test user was deleted or the password
  changed. Re-create the user and update the secret.
- **RLS errors** → the test user must have a profile row. Sign in once via the
  UI to trigger `handle_new_user()`.
