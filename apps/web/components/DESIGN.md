# Panel design system — guide for page work

Everything in the panel is built from `components/ui` (primitives), `components/shell`
(frame) and `components/kit/icon` (icons). No component library, no raw hex, no
one-off styling of things a primitive already does. The reference implementation is
`app/(panel)/dashboard/page.tsx` — copy its structure.

```ts
import { Button, Card, PageHeader, StatCard, … } from "@/components/ui";
import { Icon } from "@/components/kit/icon";
```

---

## 1. Principles

1. **Plain language.** Say what a thing does, not what it is called in the database.
   "Where visitors end up", not "Destination URL (string)". Turkish copy uses informal
   *sen* ("Linkini oluştur", not "Linkinizi oluşturun").
2. **One primary action per page, top-right** in `PageHeader actions`. Everything else is
   `secondary` or `ghost`.
3. **Every input has a label and an `info` tooltip.** `Field label="…" info="…"` or
   `SettingsRow label description info`. Hints under the field explain format/consequence.
4. **Never a dead end.** Empty states explain why it is empty and offer the next step;
   errors say what to do; a filtered-to-nothing list offers "Clear filters".
5. **Destructive actions confirm** with `ConfirmDialog` whose button names the action
   ("Delete link", never "OK"), and say whether it can be undone.
6. **Success is acknowledged** with `toast.success(…)`; failures with `toast.error(…)` or
   an inline `Field error` / `Callout tone="danger"`.
7. **Loading has shape.** `loading.tsx` mirrors the page with `Skeleton*` blocks; buttons
   use `loading` instead of disabling + changing text.
8. **Hide the rare stuff.** Advanced options go in `<Disclosure>` ("Gelişmiş ayarlar"),
   collapsed by default.

---

## 2. Tokens

Use the Tailwind utilities (`bg-bg`, `text-fg-muted`, `border-border`…). Never hex,
never `bg-white`/`text-gray-500`/`dark:` variants — the tokens already switch with the theme.
Verify any retune with `node scripts/check-contrast.mjs` (WCAG AA, both modes).

### Surfaces (the layering model)

| Utility | Light | Dark | Use for |
|---|---|---|---|
| `bg-canvas` | `#F5F6F8` | `#15171C` | Page background (set by the shell — don't repeat it) |
| `bg-bg` | `#FFFFFF` | `#1C1F26` | Cards, inputs, tables — **"surface"** |
| `bg-elevated` | `#FFFFFF` | `#232730` | Menus, popovers, modals, toasts |
| `bg-surface` | `#F2F4F7` | `#252A33` | Quiet fill inside a card: hover, tracks, icon tiles, muted badge |
| `bg-surface-subtle` | `#F9FAFB` | `#20232B` | Table header, card footer strip, read-only field |
| `bg-surface-strong` | `#EAECF0` | `#2B303A` | Hover on the canvas/sidebar, pressed state |
| `bg-sidebar` | `#F5F6F8` | `#15171C` | Sidebar rail |

### Text

| Utility | Light | Dark | Use for |
|---|---|---|---|
| `text-ink` | `#101828` | `#ECEEF1` | Primary text, headings, values |
| `text-fg-muted` | `#5B6472` | `#A1A8B3` | Descriptions, secondary text, labels of stats |
| `text-fg-subtle` | `#667085` | `#8B93A1` | Hints, timestamps, table headers, placeholders |
| `text-fg-disabled` | `#98A2B3` | `#5E6573` | Disabled only (exempt from contrast) |
| `text-accent-ink` | `#0B5F58` | `#5FD3C4` | Inline links |

### Borders

| Utility | Light | Dark | Use for |
|---|---|---|---|
| `border-border` | `#E4E7EC` | `#2E333D` | Card and control outlines |
| `border-border-subtle` | `#EEF0F3` | `#272B33` | Dividers inside a card, table rows |
| `border-border-strong` | `#D0D5DD` | `#3B414D` | Inputs, secondary buttons |
| `border-border-hover` | `#AEB6C2` | `#525A68` | Hover on inputs/secondary buttons |

### Brand accent (teal — the only brand colour)

| Utility | Light | Dark | Use for |
|---|---|---|---|
| `bg-accent` / `text-on-accent` | `#0F766E` / `#FFF` | `#2EB5A5` / `#04211E` | Primary buttons, active switch, progress |
| `bg-accent-hover` | `#0C6159` | `#4CC7B8` | Primary hover |
| `bg-accent-surface` / `text-accent-on-surface` | `#E7F5F3` / `#0B5952` | `#173532` / `#7ADCCF` | Accent badge, selected chip, first-run icon tile |
| `bg-accent-tint` / `border-accent-border` | `#F2FAF9` / `#A9DCD5` | `#182A2A` / `#24605A` | Accent callout, highlighted card |
| `ring` (focus halo) | teal 22% | teal 30% | Inputs on focus (automatic) |

Dark mode uses a **brighter** teal with **dark** label text on solid fills — never put
`text-white` on `bg-accent`; use `text-on-accent`.

### Semantic

Each has `-surface` (fill), `-border`, `-ink` (text on the surface) and the base (icons, bars, text on cards).

| Tone | Base light / dark | Use for |
|---|---|---|
| `success` | `#067647` / `#47CD89` | Active, verified, paid, saved |
| `warn` | `#B54708` / `#FDB022` | Near a limit, pending, needs attention |
| `danger` | `#B42318` / `#F97066` | Errors, destructive, over limit, failed |
| `info` | `#175CD3` / `#53B1FD` | Neutral notices, tips, trialing |

### Charts

`--chart-1…5` = teal, amber, blue, pink, violet (validated for colour-blind separation
and ≥3:1 on `bg-bg` in both modes). Assign in that fixed order; never invent a 6th hue —
fold extras into "Other" (`--chart-muted`). Series text/legends stay `text-fg-muted`;
the coloured dot carries identity. Use `chartColors` / `seriesColor(i)` from
`components/kit/chart-theme.ts` in Recharts.

### Radius, shadow, type

| Token | Value | Where |
|---|---|---|
| `rounded-xs` / `rounded-sm` | 4 / 6px | Kbd, badges, menu items, segmented items |
| `rounded-default` | 8px | Buttons, inputs, nav items |
| `rounded-md` | 10px | Menus, popovers, callouts, plan card |
| `rounded-lg` | 12px | **Cards**, tables, empty states |
| `rounded-xl` | 16px | Modals, command palette |
| `shadow-xs` | hairline | Inputs, secondary buttons |
| `shadow-card` | whisper | Cards (automatic in `Card`) |
| `shadow-lift` | soft | Hover on linked cards |
| `shadow-pop` / `shadow-toast` / `shadow-modal` | layered | Menus / toasts / dialogs (automatic) |

Font: **Inter** (`font-sans`) for everything, **IBM Plex Mono** (`font-mono`) only for
slugs, URLs, IDs, keys and code. Numbers that change: add `numeric` (tabular figures).
Scale: page title `text-2xl font-semibold`, card title `text-[15px] font-semibold`,
body `text-sm`, secondary `text-[13px]`, meta `text-xs`. **No more
`font-mono uppercase tracking-widest` eyebrows** — use sentence-case `text-[13px] font-medium text-fg-subtle`.

### Spacing scale

4px base. Use these and nothing in between:

| Gap | px | Where |
|---|---|---|
| `gap-1.5` / `gap-2` | 6 / 8 | Icon + label, button groups |
| `gap-3` | 12 | Inside a card between header and content, list rows |
| `gap-4` | 16 | Grid gutters (`Grid` does this), fields in a form |
| `gap-5` | 20 | Card padding (`Card` does this), field groups |
| `gap-6` | 24 | **Between page blocks** (the shell's `<main>` does this) |
| `gap-8` | 32 | Between major sections on long pages (`contentClassName="gap-8"`) |

---

## 3. The frame (you get this for free)

`PanelShell` renders sidebar, topbar, mobile tab bar, command palette, toasts and the
content column: **max-width 1280px, gutters 16/24/32px, 24px between children**.
Pages never set their own width, padding or background.

```tsx
<PanelShell title={t("title")} crumbs={[{ label: context.workspace.name }]}>
  <PageHeader … />
  …blocks…
</PanelShell>
```

- `title` + `crumbs` feed the topbar breadcrumb (and the mobile title). For detail pages
  pass the parent: `crumbs={[{ label: tn("links"), href: "/links" }]}`.
- `topbarActions` still works but **don't use it for the primary action** — that belongs in
  `PageHeader actions`. Leave the topbar to global controls.
- `searchable={false}` on screens that have their own search field.
- Sidebar groups (lib/nav.ts): **Analyze** (Dashboard, Analytics) · **Create** (Links, QR
  codes, Bio pages) · **Manage** (Domains, Settings, Billing) · **Help** (Docs) · Platform
  (superadmin). The sidebar also has the workspace switcher, a **+ Create** menu (link / QR /
  bio) and the plan card with the link-usage meter + upgrade button.
- Mobile: bottom tab bar (Home · Links · **+** · Analytics · More) + drawer.

---

## 4. Components

All props are optional unless noted. Existing props on older components were kept.

### Layout & structure

**`PageHeader`** — top of every page. `title`\*, `description`, `eyebrow`, `meta` (badges
next to the title), `breadcrumbs` (`Crumb[]` or node), `back={{ href, label }}`, `icon`
(kit icon name), `actions` (primary, right), `secondaryActions` (left of primary),
`tabs` (a `TabLinks`/`Tabs` row). Replaces `Hero` (which now renders a PageHeader).

**`Card`** — the base surface. Slots: `title`, `description`, `actions`, `footer`,
`headingLevel`, `padding` (`none|sm|md|lg`). `padding="none"` keeps the header padded and
lets a `<Table bare>` run edge to edge. `href` makes the whole card a link (hover lift).
Legacy metric props (`label`, `value`, `delta`, `trend`, `icon`, `loading`) still work —
prefer `StatCard`. `staticHover` is now a no-op (only linked cards lift).

**`Section`** — an *unboxed* heading + description + actions above content on the canvas.

**`SectionCard`** + **`SettingsRow`** — settings/forms. `SectionCard`: `title`\*,
`description`, `actions`, `footer` (tinted strip, home of Save), `tone="danger"`,
`divided` (default true), `id`. `SettingsRow`: `label`\*, `description`, `info`,
`htmlFor`, `layout="inline|stacked"`, children = the control.

**`Grid`** `columns={2|3|4|12}` — responsive grid with 16px gutters.

**`Disclosure`** (alias `Advanced`) — collapsible "Gelişmiş ayarlar". `title` (defaults to
the localized "Advanced settings"), `description`, `badge`, `defaultOpen`, `open`/
`onOpenChange`, `variant="card|plain"`. Content stays mounted, so fields keep values and
submit with native forms.

**`Steps`** (alias `Stepper`) — guided flows. `steps: {id, label, description?, done?}[]`\*,
`current` (id or index)\*, `onStepClick` (only finished steps are clickable),
`orientation="horizontal|vertical"`.

**`KeyValue`** — record details. `items: {label, value, info?, copy?, mono?}[]`\*,
`layout="rows|grid"`, `columns={2|3}`.

### Data display

**`StatCard`** — KPI tile. `label`\*, `value`\*, `delta` (e.g. `"12%"`), `trend`
(`up|down|neutral` → green/red/grey pill with arrow — pass the number without an arrow),
`deltaLabel` ("vs previous 7 days"), `info`, `icon` (kit name), `href` (whole tile links,
info tip stays clickable), `sparkline`, `children`, `loading`.

**`Sparkline`** — dependency-free SVG trend line. `data: number[]`\*, `tone`
(`chart-1…5|accent|muted`), `height` (36), `area`.

**`Table`** + `TableHead/Body/Row/HeaderCell/Cell` — `stickyHeader`, `density`
(`comfortable|compact`), `pending`, `label`, `bare` (inside a `Card padding="none"`).
Row: `selected`, `interactive`. Cell: `numeric`, `truncate`, `align`.

**`Badge`** — `tone`: `success|warn|danger|info|accent|muted|neutral|inverse`, `dot`,
`size="sm|md"`. Statuses: use `StatusBadge` from `components/shell/status-badge`.

**`EmptyState`** — `title`\*, `description`, `icon` (kit name or node), `actions`, `hint`,
`eyebrow`, `size="sm|md"`, `tone="default|first-run"`, `bare` (inside a Card).

**`Progress`** (`tone`, `size="sm|md"`), **`QuotaMeter`** (`label`, `used`, `limit`,
`info`, `upgradeHref`, `compact`), **`BreakdownList`**, **`Timeline`**, **`Skeleton`**,
`SkeletonText`, `SkeletonTable`, `SkeletonCard`, `SkeletonChart`.

### Actions & inputs

**`Button`** — `variant`: `primary | secondary (= default) | ghost | danger | cloudflare`;
`size`: `sm` 32px · `md` 38px · `lg` 44px; `icon` (square, needs `aria-label`);
`leadingIcon` / `trailingIcon` (kit icon names); `loading`; `block`; `href`, `external`,
`download`.

**`Field`** — `label`, `info`, `hint`, `error`, `required`, `optional`. Wraps the control
in a `<label>`. **`Input`** — all native props + `prefix` / `suffix` (inline adornments,
e.g. `prefix="short.ky/"`) + `wrapperClassName`. `Select`, `Textarea`, `SecretInput`,
`DateTimePicker` unchanged API. All text controls are 38px tall with a teal focus halo.

**`CopyField`** — read-only value + copy button. `value`\*, `label`, `info`, `hint`,
`mono` (default true), `secret` (masked with reveal), `href` (adds "open"), `size`.
`CopyButton` still exists for inline icon buttons.

**`Segmented`** — 2–5 option single choice (radio group). `items: {id, label, icon?}[]`\*,
`value`\*, `onChange`\*, `label`, `size`, `block`, `name` (hidden input for forms).

**`Tabs`** — `variant="underline"` (page sections) or `"segmented"` (`"pill"` = same).
**`TabLinks`** — the same look as real links (`?tab=` / sub-routes); use in `PageHeader tabs`.

**`Switch`** (`checked`, `onCheckedChange`, `size`), **`Chip`** (filter toggle, `active`),
**`FilterBar`**, **`Pagination`**, **`Dropdown`** (items now support `heading`,
`description`, `shortcut`, `selected`, `separated`, `danger`), **`InfoTip`**, **`Kbd`**.

### Feedback & overlays

**`Callout`** — inline message. `tone`: `info|success|warn|danger|accent|neutral`, `title`,
children, `icon` (name or `false`), `actions`, `onDismiss` / `dismissible`.

**`toast`** — `import { toast } from "@/components/ui"` then `toast.success("Link saved")`,
`toast.error(title, body)`, `toast.info`, `toast.warn`, or
`toast({ title, tone, action: { label, onClick } })`. Survives navigation (store is
module-level; `PanelShell` renders the `<Toaster />`). `useToast()` returns the same object.

**`Modal`** — `size="sm|md|lg|xl"`, `icon`, `tone`, `footer` (primary last).
**`ConfirmDialog`** — `open`, `title`, `description`, `confirmLabel`\*, `tone="danger"`,
`loading`, `confirmDisabled`, `onConfirm`, `onClose`, children (type-to-confirm input).
**`Sheet`** — side/bottom panel for detail and rule editors. **`SaveBar`** — floating
"unsaved changes" bar for long forms. **`Paywall`** — locked feature preview.

---

## 5. Page recipes

### List page (links, QR codes, bio pages, domains)

```tsx
<PanelShell title={tn("links")} crumbs={[{ label: context.workspace.name }]} searchable={false}>
  <PageHeader
    title={tn("links")}
    meta={<Badge tone="neutral">{total}</Badge>}
    description={t("description")}
    secondaryActions={<><RewriteDestinationsButton /><LinksCsvBar /></>}
    actions={<Button variant="primary" leadingIcon="plus" href="/links/new">{tc("newLink")}</Button>}
  />
  <FilterBar … />                         {/* search left, chips, sort right */}
  {rows.length === 0 ? (
    <EmptyState tone={filtered ? "default" : "first-run"} icon="link" … />
  ) : (
    <Table stickyHeader>…</Table>
  )}
  <Pagination … itemLabel={t("itemsNoun")} />
</PanelShell>
```

Row actions: a ghost icon `Button` with `Icon name="ellipsis"` as a `Dropdown` trigger;
destructive items `danger: true, separated: true` and they open a `ConfirmDialog`.

### Detail page (a link, a domain, a QR code)

```tsx
<PageHeader
  back={{ href: "/links", label: tn("links") }}
  title={link.title ?? `${host}/${slug}`}
  meta={<StatusBadge status={status} />}
  secondaryActions={<Button leadingIcon="chart-line" href={`/links/${id}/stats`}>{t("stats")}</Button>}
  actions={<Button variant="primary" leadingIcon="pen" href={`/links/${id}/edit`}>{tc("edit")}</Button>}
  tabs={<TabLinks value={tab} items={[…]} />}
/>
<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
  <Card title={t("shortLink")}><CopyField value={shortUrl} href={shortUrl} /></Card>
  <Card title={t("details")}><KeyValue items={[…]} /></Card>
</div>
```

### Create / edit form page

Left: the form in cards, essentials first. Right (lg+): live preview or help. Advanced
options collapsed. Primary submit in the last card's footer (and optionally a `SaveBar`
on long edit forms).

```tsx
<PageHeader back={{ href: "/links", label: tn("links") }} title={t("newLinkTitle")} description={t("newLinkDesc")} />
<Steps steps={[{ id: "dest", label: t("stepDestination") }, …]} current="dest" />  {/* only for true multi-step flows */}
<form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
  <div className="flex min-w-0 flex-col gap-6">
    <Card title={t("destination")} description={t("destinationDesc")}>
      <Field label={t("url")} info={t("urlInfo")} hint={t("urlHint")} required>
        <Input name="destination" type="url" placeholder="https://" />
      </Field>
      <Field label={t("slug")} info={t("slugInfo")} optional={tc("optional")}>
        <Input name="slug" prefix={`${domain}/`} />
      </Field>
    </Card>
    <Disclosure description={t("advancedDesc")}>
      <div className="grid gap-4 sm:grid-cols-2">…UTM, expiry, password, targeting…</div>
    </Disclosure>
    <div className="flex justify-end gap-2">
      <Button href="/links">{tc("cancel")}</Button>
      <Button variant="primary" type="submit" loading={pending}>{t("createLink")}</Button>
    </div>
  </div>
  <aside className="hidden lg:block"><Card title={t("preview")}>…</Card></aside>
</form>
```

After success: `toast.success(t("created"))` then navigate.

### Settings page

```tsx
<PageHeader title={t("title")} description={t("description")}
  tabs={<TabLinks value={tab} items={[{ id: "profile", label: t("profile"), href: "?tab=profile" }, …]} />} />
<SectionCard title={t("workspace")} description={t("workspaceDesc")}
  footer={<Button variant="primary" type="submit" loading={pending}>{tc("save")}</Button>}>
  <SettingsRow label={t("name")} description={t("nameDesc")} info={t("nameInfo")} htmlFor="ws-name">
    <Input id="ws-name" name="name" defaultValue={workspace.name} />
  </SettingsRow>
  <SettingsRow label={t("emails")} description={t("emailsDesc")}>
    <Switch checked={on} onCheckedChange={setOn} aria-label={t("emails")} />
  </SettingsRow>
</SectionCard>
<SectionCard tone="danger" title={t("danger")} description={t("dangerDesc")}>
  <SettingsRow label={t("delete")} description={t("deleteDesc")}>
    <Button variant="danger" onClick={() => setConfirm(true)}>{t("delete")}</Button>
  </SettingsRow>
</SectionCard>
```

### Stats page

```tsx
<PageHeader title=… secondaryActions={<RangePicker value={range.key} />} actions={<Button leadingIcon="download">{ts("export")}</Button>} />
<Grid columns={4}>{/* StatCard × 4 with info tooltips and deltas */}</Grid>
<Card title={t("clickTrend")} actions={…}><TimeseriesChart … /></Card>
<Grid columns={2}><BreakdownList … /><BreakdownList … /></Grid>
```

Empty range → `EmptyState bare` inside the chart card, not a blank plot.

### Empty states

| Situation | tone | Title | Action |
|---|---|---|---|
| First run, nothing created | `first-run` | "No links yet" | primary "Create your first link" |
| Filter/search matched nothing | `default` | "No links match “x”" | secondary "Clear filters" |
| No data in the range | `default` | "No clicks in this range" | hint "Try a wider range" |
| Feature not in plan | — | use `Paywall` | "See plans" |

### Loading

Each route with slow data has `loading.tsx` rendering `PanelShell` + skeletons in the
page's exact shape (`SkeletonCard` for StatCards, `SkeletonTable rows columns`,
`SkeletonChart`). See `app/(panel)/dashboard/loading.tsx`.

---

## 6. Copy rules

- Titles: sentence case, 1–4 words ("Top links", not "TOP LINKS").
- Descriptions: one sentence, what it is *for*. Max ~120 characters.
- Buttons: verb + object ("Create link", "Add domain", "Invite teammate"). Never "Submit"/"OK".
- Info tooltips: 1–2 sentences answering "what happens if I set this?".
- Errors: what went wrong + what to do ("This slug is taken. Try another or leave it empty for a random one.").
- Numbers: `formatNumber()`; percentages without decimals unless < 10.
- Turkish: informal *sen*, the same terms as the nav ("Link", "QR kod", "Bio sayfası", "Çalışma alanı").
- All strings through `next-intl`; add keys to **both** `messages/en.json` and `messages/tr.json`.
  Shell strings live in `shell.*`, shared UI strings in `common.*`.

---

## 7. Do / Don't

| Do | Don't |
|---|---|
| `PageHeader` at the top of every page | `Hero` in new code, or a hand-rolled header box |
| `Card title actions` for boxed content | `<div className="rounded-default border bg-bg p-5">` |
| `Callout tone="warn"` for alerts | Coloured `div`s with `bg-warn-surface` built by hand |
| `Button leadingIcon="plus"` | `<Button><Icon name="plus" className="text-sm" />…` (still works, just noisier) |
| `StatusBadge` / `Badge tone="success"` for healthy states | `tone="accent"` to mean "OK" |
| `EmptyState` with an action | A blank table or "No data" text |
| `ConfirmDialog` before delete/revoke/archive-all | `window.confirm` or deleting on first click |
| `toast.success` after a save | Silent success, or an alert box that stays forever |
| `Disclosure` for rarely used options | Showing 20 fields at once |
| Tokens (`text-fg-muted`, `bg-surface`) | Hex, `text-gray-*`, `dark:` overrides |
| `font-mono` for slugs/URLs/keys | Mono uppercase tracked eyebrows as decoration |
| One primary button per view | Two teal buttons side by side |

---

## 8. Checks before you hand a page back

- Light **and** dark look right (toggle in the user menu / topbar).
- 375px wide: nothing overflows, actions wrap under the title, tables scroll horizontally.
- Keyboard: every control reachable, focus ring visible, dialogs trap focus, Esc closes.
- Every input: label + `info`; every list: empty state; every async action: loading + toast.
- `npx tsc --noEmit` passes. If you touched tokens: `node scripts/check-contrast.mjs`.
