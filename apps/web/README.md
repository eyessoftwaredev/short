# Template Panel

Standalone Next.js admin/user panel theme built with Tailwind CSS v4.

## Run

```bash
cd template
pnpm install
pnpm dev
```

Open `http://localhost:3200`.

## Routes

| Route | Description |
|-------|-------------|
| `/login` | Demo sign-in |
| `/dashboard` | KPI cards + table |
| `/table` | Projects list (admin nav) |
| `/settings` | Profile form |
| `/docs` | Full component catalog (50 sections) |

Use the sidebar footer to switch between **Admin** and **User** roles. User role hides the Projects nav item.

## Copy into another project

Copy the entire `template/` folder, run `pnpm install`, and customize tokens in `app/globals.css` (panel) or `styles/kit/tokens.css` (catalog).

## Catalog (50 sections)

All catalog sections live under `template/catalog/` with demo data in `template/data/` and kit styles in `template/styles/kit/`. Open `/docs` for the full interactive catalog (Renk, Buton, Kanban, Chart, …).
