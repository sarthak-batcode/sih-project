# Authentication removal

The application is now public-access: it opens directly on the dashboard, and every screen and
endpoint is reachable without credentials. This is a record of exactly what was taken out.

## Files deleted

| File | What it was |
|---|---|
| `frontend/src/context/AuthContext.tsx` | Session state, login/logout, token restore |
| `frontend/src/pages/LandingPage.tsx` | The login page and its demo-account buttons |
| `backend/app/api/v1/auth.py` | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| `backend/app/core/rbac.py` | `get_current_user()` and `require_roles()` dependencies |
| `backend/app/core/security.py` | Bcrypt hashing, JWT encode/decode |
| `backend/app/models/user.py` | The `users` table |
| `backend/app/schemas/auth_schema.py` | Login/register/token/user payloads |
| `tests/test_security_auth.py` | Password-hashing and RBAC tests |

## Files modified

**Frontend**

- `App.tsx` — removed `AuthProvider`, the `Protected` route guard, the `LoginRoute` wrapper and the
  `/login` route. Routes now render the shell directly. `*` still redirects to `/`, so an old
  `/login` bookmark lands on the dashboard instead of a dead route.
- `components/common/Navbar.tsx` — removed the user name/role block and the sign-out button, plus
  the `useAuth` hook and the `LogOut` icon import. The brand and the IST clock are unchanged.
- `components/common/Sidebar.tsx` — removed the `roles` field on the Audit log entry and the
  `.filter()` that hid nav items by role. All seven modules are visible.
- `services/api.ts` — removed the request interceptor that attached the bearer token, the response
  interceptor that cleared the session on 401, and the `login()` / `getMe()` methods. Also dropped
  the 403 branch in `describeError`, which can no longer occur.
- `pages/SettingsPage.tsx` — removed `isAdmin` gating: the read-only banner, the `disabled`
  attributes on every control, and the `Lock` icon import. The sliders are editable by anyone.
- `types/index.ts` — removed `UserRole` and `UserProfile`.
- `pages/AuditLogsPage.tsx` — removed the "Logins" option from the action-type filter, which can no
  longer match any row.

**Backend**

- `main.py` — removed the auth router registration, the `user` model import, and the production
  `SECRET_KEY` guard (nothing signs tokens now).
- `api/v1/{dashboard,areas,analytics,model_metrics,predictions,settings,audit}.py` — removed the
  `current_user: User = Depends(...)` parameter and the `rbac` / `models.user` imports from every
  endpoint. `PATCH /settings` and `GET /audit/logs` no longer require a role.
- `core/audit_logger.py` — `actor_email` and `actor_role` became optional, defaulting to
  `public@cyberintel.gov.in` / `public`.
- `models/__init__.py` — dropped `User`, added the previously missing `SystemSetting`.
- `config.py` — removed `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` and the
  production secret-key validator.
- `database/seed_data.py` — removed the demo-user seeding block and its imports; steps renumbered
  from 1/4–4/4 to 1/3–3/3.
- `requirements.txt` — removed `passlib[bcrypt]`, `bcrypt`, `pyjwt`, `python-jose[cryptography]`.

**Tests**

- `tests/test_backend_api.py` — removed the token fixtures and the two auth-endpoint tests; every
  remaining call drops its bearer header.
- `tests/test_regressions.py` — replaced `test_protected_endpoints_reject_anonymous_requests` with
  `test_every_endpoint_is_publicly_reachable` (the inverse assertion), added
  `test_no_auth_routes_remain`, and removed the bad-password and analyst-403 tests.

## Deliberately kept

**The audit ledger.** It is a feature with its own screen, not part of the auth system. It still
records every prediction and threshold change with parameters, before/after values and timestamps.
Only the *who* changed: with no signed-in officer, rows are attributed to
`public@cyberintel.gov.in` with role `public`.

`PredictionRecord.created_by_email` is likewise populated with the public identity rather than
dropped, so the column and any existing rows stay valid.

## Not changed

No colours, spacing, typography, layout, animation, chart, model, dataset or API response shape was
touched. The only visual differences are the absence of the login page and of the two auth controls
in the top bar.

## Verified

- 35 tests pass; `tsc --noEmit` clean; `vite build` clean; all Python compiles.
- Every endpoint returns 200 with no credentials; `/auth/*` returns 404.
- In a browser: `/` lands on the dashboard, `/login` redirects to `/`, all six other routes open
  directly, `localStorage`/`sessionStorage`/cookies are empty, and there are no console errors.
- Saving a threshold and running a prediction both work through the UI and appear in the audit log.
