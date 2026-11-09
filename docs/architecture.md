# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep React components responsible for rendering accessible loading, empty, success, and error states; keep URL construction and HTTP error handling in the shared API client, using relative `/api` paths with the optional `VITE_API_BASE_URL` override.
- Logic tier decision: Keep Express routes thin and put validation and business rules in typed service functions; return deliberate 4xx responses for invalid identifiers, missing records, and invalid payloads rather than allowing database cast errors to become 500 responses.
- Data tier decision: Express relationships and invariants will be represented by Mongoose schemas with required fields, references, sensible defaults, and stable seed keys; seed operations will use targeted upserts so unrelated records survive repeated runs.
- Activity tracking approach: Validate `userId` and `teamId`, confirm both referenced documents exist, calculate points from the submitted activity type and minutes, and persist the linked activity with its creation timestamp.
- Team management approach: Validate a non-empty name and mascot, default members to an empty array, preserve submitted member references, and expose created and listed teams through the API.
- Leaderboard approach: Aggregate activity points by team, join the totals to team names, sort descending by total points, and assign ranks starting at 1.
- Workout suggestions approach: Resolve the user by email, use the user's fitness goal and recent activity to choose matching workouts, include a human-readable reason, and return a deliberate 4xx response when the user is unknown.

## Test plan

Record the commands you run and what each failure means. The initial baseline was run before implementation:

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
- Baseline result: 4 of 5 tests failed because the User, Team, Activity, and Workout schemas did not yet enforce their required fields; the idempotent seed test passed.
- API command: `npm run test:api --prefix octofit-tracker/backend`
- Baseline result: all 4 tests failed because activity/team creation returned `501`, the leaderboard returned an empty array, and workout suggestions ignored the matching user's goal/activity.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
- Baseline result: all 15 tests failed because the route components still rendered the pending scaffold instead of fetching and displaying API data or exposing loading, empty, and error states.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
- Baseline result: passed; the TypeScript backend scaffold type-checks.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
- Baseline result: passed; the Vite frontend scaffold type-checks and bundles successfully.

Smallest safe implementation order: complete and test the data tier first, then implement activities and teams in the logic tier, followed by leaderboard and workout suggestions, and finally implement each frontend route against the shared API client. Re-run the focused tier test after each capability, then run both builds and an end-to-end smoke check on ports 27017, 8000, and 5173.
