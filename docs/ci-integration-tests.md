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
      - name: Run tests
        env:
          TEST_SUPABASE_EMAIL: ${{ secrets.TEST_SUPABASE_EMAIL }}
          TEST_SUPABASE_PASSWORD: ${{ secrets.TEST_SUPABASE_PASSWORD }}
        run: bunx vitest run
```

### GitLab CI

Project → **Settings → CI/CD → Variables** (mark both as *Masked* and *Protected*).

```yaml
test:
  image: oven/bun:1
  script:
    - bun install --frozen-lockfile
    - bunx vitest run
  variables:
    TEST_SUPABASE_EMAIL: $TEST_SUPABASE_EMAIL
    TEST_SUPABASE_PASSWORD: $TEST_SUPABASE_PASSWORD
```

### Local one-off run

```bash
TEST_SUPABASE_EMAIL=ci-tests@example.com \
TEST_SUPABASE_PASSWORD='your-password' \
bunx vitest run src/lib/searchProfiles.integration.test.ts
```

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
