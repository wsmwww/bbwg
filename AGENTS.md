# Repository Guidelines

## Project Structure & Module Organization

This repository is a qiankun-style micro-frontend workspace. `main-app/` is the host application, while `vue-app/`, `react-app/`, and `hero-card-app/` are independently built frontend modules. Each frontend keeps source files in `src/`, static files in `public/`, and its webpack configuration at the module root. `info-statistics-api/` is the Node.js API service; its route code is in `src/`, persistence adapters are in `src/repositories/`, and local development data is in `data/`. Root-level `scripts/` and `.bat` files start, stop, or restart the local stack.

## Build, Test, and Development Commands

Run commands from the relevant module directory:

- `npm install` installs that module's dependencies.
- `npm run dev` starts a webpack development server. Default ports are 8080 (`main-app`), 8081 (`vue-app`), 8082 (`react-app`), and 8084 (`hero-card-app`).
- `npm run build` creates a production `dist/` directory for the frontend module.
- `npm start` in `info-statistics-api/` starts the local API on port 8090 when defined by that package.

Use `scripts/start-all.ps1` or `启动全部项目.bat` to run the full local environment. There is no configured automated test suite; validate changed modules with their production build and targeted browser checks.

## Coding Style & Naming Conventions

Follow existing JavaScript and Vue conventions: two-space indentation, semicolons, single-quoted strings, and trailing commas only where surrounding code uses them. Use `PascalCase.vue` for Vue components, `camelCase` for functions and variables, and descriptive kebab-case names for static asset files. Keep API paths stable and add service logic beside the relevant module, rather than coupling modules directly.

## Cloudflare Pages & Configuration

`vue-app/` deploys to Cloudflare Pages with `npm run build` and `dist/` as the output directory. External API proxying belongs in `vue-app/functions/`; do not add external `200` proxy rules to `_redirects`, because Cloudflare Pages only supports relative-path rewrites. Keep Pages Functions as ES modules and preserve query strings when forwarding requests.

## Commit & Pull Request Guidelines

Commit history uses short, imperative summaries, often in Chinese (for example, `数据更新 优化排行版展示`). Keep commits focused on one feature or fix. Pull requests should describe user-visible behavior, list affected modules, include validation commands, and attach screenshots for UI changes. Do not commit credentials, tokens, or environment-specific configuration.
