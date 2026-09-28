import { Button } from "@/components/ui";
import { panelUrl } from "@/lib/public-url";
import { cn } from "@/lib/cx";

type LandingAuthLinksProps = {
  signedIn: boolean;
  labels: { signIn: string; start: string; openPanel: string };
  /** Stretch both buttons, e.g. inside the phone menu. */
  block?: boolean;
  className?: string;
};

/**
 * Account entry points. They always point at the panel host, which may differ
 * from the marketing host when the two are split.
 */
export function LandingAuthLinks({ signedIn, labels, block = false, className }: LandingAuthLinksProps) {
  if (signedIn) {
    return (
      <span className={cn("flex items-center gap-2", className)}>
        <Button variant="primary" href={panelUrl("/dashboard")} trailingIcon="arrow-right" block={block}>
          {labels.openPanel}
        </Button>
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-2", block && "flex-col-reverse items-stretch", className)}>
      <Button variant={block ? "secondary" : "ghost"} href={panelUrl("/login")} block={block}>
        {labels.signIn}
      </Button>
      <Button variant="primary" href={panelUrl("/register")} block={block}>
        {labels.start}
      </Button>
    </span>
  );
}
