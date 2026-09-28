import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/kit/icon";
import { EmptyState } from "@/components/ui";
import { ShareChrome } from "./share-chrome";

/** Unknown, revoked and expired share links all look the same. */
export default async function ShareNotFound() {
  const t = await getTranslations("share");
  return (
    <ShareChrome>
      <EmptyState
        className="mx-auto w-full max-w-lg"
        icon={<Icon name="compass" className="text-lg" />}
        eyebrow="404"
        title={t("notFoundTitle")}
        description={t("notFoundBody")}
      />
    </ShareChrome>
  );
}
