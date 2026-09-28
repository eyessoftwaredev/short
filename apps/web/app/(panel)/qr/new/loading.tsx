import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { QrDesignerSkeleton } from "../designer-skeleton";

/** Without its own boundary this route would flash the QR list skeleton of its parent. */
export default async function QrDesignerLoading() {
  const t = await getTranslations("qr");
  return (
    <PanelShell title={t("title")} crumbs={[{ label: t("title"), href: "/qr" }]}>
      <QrDesignerSkeleton />
    </PanelShell>
  );
}
