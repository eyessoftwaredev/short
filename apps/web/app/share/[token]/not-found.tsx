import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui";
import { ShareChrome } from "./share-chrome";

/** Unknown, revoked and expired share links all look the same. */
export default async function ShareNotFound() {
  const t = await getTranslations("share");
  return (
    <ShareChrome>
      <EmptyState
        className="mx-auto w-full max-w-lg"
        icon="compass"
        title={t("notFoundTitle")}
        description={t("notFoundBody")}
      />
    </ShareChrome>
  );
}
