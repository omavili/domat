# domat

A simple Pomodoro timer for managing your time and focus. It alternates focus sessions (25 minutes) with short (5 minutes) and long (15 minutes) breaks, and every duration can be changed. After four focus sessions you get a long break. You can start, pause, reset or skip at any time, and the whole timer works from the keyboard with Tab and Enter/Space. The remaining time shows in the browser tab title, so you can keep an eye on it from another tab. When a session ends, domat sends a browser notification (on by default) and can play a short sound if you turn it on. Nothing is saved, so every visit starts fresh.

## Requirements

Node.js 22 or later and npm.

## Getting started

```bash
npm install
npm run dev
```

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint the code with oxlint |
| `npm test` | Run the tests once |

To run a single test file: `npx vitest run src/timer/reducer.test.ts`

## License

See the [LICENSE](LICENSE) file.
