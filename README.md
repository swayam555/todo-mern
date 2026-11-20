# Weekly To-Do (MERN)

Mobile-first to-do app: create, edit, delete and search tasks, grouped into **Monday–Sunday weeks** with open/completed counts per week.

- **client/**: React 19 + Vite + Tailwind CSS v4
- **server/**: Express 5 + Mongoose (MongoDB)
- **netlify/functions/api.mjs**: the same Express app served as a Netlify Function, so one Netlify site hosts both the UI and the API

## Features
- UI follows the provided **Figma design** (To-Do List Mobile): an onboarding screen ("Manage What To Do" → Get Started, shown once), a home screen with a search bar, a Mon–Sun day strip, **Task Complete / Task Pending this week** cards, a Weekly Progress bar, "Tasks Today" rows with checkbox / delete / edit icons, a round + button, the "Add New Task" bottom sheet and the search screen.
- Tap a day in the strip to list that day's tasks. "View All" jumps to the week-by-week cards.
- Create a task with title*, description, date & time*, and priority (Low / Medium / High). New tasks default to the open week.
- Edit any field, and mark a task **Completed** or **In progress** (checkbox or the details sheet). Week cards update straight away.
- Delete by **swiping a task left** and tapping Delete (mouse drag works too). You can also delete from the details sheet or search, or press the `Delete` key on a focused row. A toast offers **Undo**.
- Search by keywords across title and description. Every keyword must match, matching is case-insensitive, and matches are highlighted. Each result can be viewed, edited or deleted.
- The home screen shows one card per week with Open, Completed and progress. Tap a card to expand it and see its tasks. The current week is highlighted and always shown.
- Weeks are calculated **in the user's time zone** on the server (`$dateTrunc`, `startOfWeek: monday`), so a Sunday 11:30 pm task stays in the right week.
- No sign-up is needed. Each browser gets an anonymous id (`X-Client-Id`, a UUID in localStorage), so visitors to the public deploy never see each other's tasks.

### Extras (beyond the brief)
- **Overdue tracking:** open tasks past their time are marked *Overdue* in red. The home screen shows an "N overdue tasks" banner that opens search filtered to them.
- **Search filters:** Status (All / Open / Done / Overdue) and Priority (High / Medium / Low) chips. They combine with keywords, or work on their own to browse.
- **Move to tomorrow:** one tap in the task details sheet pushes a task to tomorrow at the same time, with Undo.
- **Duplicate:** copy a task and open the copy straight in the edit sheet.
- **Keyboard shortcuts** (desktop): `/` opens search, `n` adds a task.

## API
All `/api/tasks` routes need an `X-Client-Id: <uuid>` header.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | |
| GET | `/api/tasks/weeks?tz=Asia/Kolkata` | `[{ weekStart, total, open, completed }]` |
| GET | `/api/tasks?q=&week=YYYY-MM-DD&tz=&status=&priority=&overdue=1` | search / filter / one week's tasks |
| GET | `/api/tasks/:id` | |
| POST | `/api/tasks` | `{ title, dueAt, description?, priority? , status? }` |
| PATCH | `/api/tasks/:id` | any of the above; `status: "completed" \| "in_progress"` |
| DELETE | `/api/tasks/:id` | 204 |

## Run locally
```bash
npm install
cp server/.env.example server/.env   # then put your Atlas string in MONGODB_URI
npm run dev -w server     # :4000 — reads server/.env (MONGODB_URI); falls back to in-memory MongoDB if unset
npm run dev -w client     # :5173, proxies /api → :4000
```

## Tests
```bash
npm test -w server   # 35 API tests (supertest + mongodb-memory-server), incl. the Netlify function
npm test -w client   # 10 unit/component tests (week math, form validation)
```

## Deploy to Netlify
1. Create a free MongoDB Atlas cluster and allow access from anywhere (`0.0.0.0/0`). Netlify Functions don't have fixed IPs.
2. Import the repo into Netlify. `netlify.toml` already sets the build command, the publish dir, the functions bundler, and the `/api/*` → function redirect.
3. Set the environment variable `MONGODB_URI`, then deploy.

To host the API somewhere else instead (Render, Railway, etc.), run `npm start -w server` there and build the client with `VITE_API_URL=https://your-api/api`.

## License
MIT. See [LICENSE](LICENSE).
