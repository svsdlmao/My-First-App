# Task Manager (Angular)

Angular 21 frontend for a task manager, backed by the [Tasks API](https://github.com/svsdlmao/Tasks-Api) (NestJS).

## Features
- Sign up / log in (JWT, attached to every request by an HTTP interceptor)
- Create, edit, delete and restore tasks, with status, due date and custom task types
- Filter by status, with pagination
- **Reports** page with task statistics
- **AI help** on any task, powered by the API's LLM endpoint
- Light / dark theme
- Deployed on Netlify (SPA redirects in `netlify.toml`)

## Stack
Angular 21 (standalone components, signals) · TypeScript · CSS · Netlify

## Run locally

```bash
npm install
npx ng serve
```

Open http://localhost:4200. The app points at the deployed API; to use a local one, change `API` in `src/app/services/*.ts` to `http://localhost:3000`.
