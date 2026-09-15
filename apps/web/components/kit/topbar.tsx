import type { ReactNode } from "react";

type Crumb = {
  label: string;
  href?: string;
};

type TopbarProps = {
  crumbs?: Crumb[];
  current?: string;
  searchPlaceholder?: string;
  actions?: ReactNode;
  onSearch?: (value: string) => void;
};

export function Topbar({
  crumbs = [],
  current,
  searchPlaceholder = "Search…",
  actions,
  onSearch,
}: TopbarProps) {
  return (
    <header className="kit-topbar">
      <nav className="kit-topbar__crumbs" aria-label="Breadcrumb">
        {crumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`} style={{ display: "contents" }}>
            {crumb.href ? (
              <a href={crumb.href}>{crumb.label}</a>
            ) : (
              <span style={{ color: "var(--fg-muted)" }}>{crumb.label}</span>
            )}
            <span className="kit-topbar__sep">/</span>
          </span>
        ))}
        {current ? <span className="kit-topbar__current">{current}</span> : null}
      </nav>
      <input
        type="search"
        className="kit-topbar__search"
        placeholder={searchPlaceholder}
        onChange={(event) => {
          try {
            onSearch?.(event.target.value);
          } catch {
            /* ignore consumer errors */
          }
        }}
      />
      <div className="kit-topbar__actions">{actions}</div>
    </header>
  );
}
