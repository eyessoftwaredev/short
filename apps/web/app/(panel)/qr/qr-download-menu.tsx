"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/kit/icon";
import { Button, Dropdown, type DropdownItem } from "@/components/ui";
import { useQrDownload, type QrDownloadFormat } from "./qr-download";

type QrDownloadMenuProps = {
  qrId: string;
  name: string;
  /** PNG/PDF width in pixels; the saved default size when omitted. */
  size?: number;
  /** Runs before a download starts; return false to cancel (e.g. saving failed). */
  beforeDownload?: () => Promise<boolean>;
  buttonSize?: "sm" | "md";
  variant?: "secondary" | "ghost";
  /** Extra menu entries under the formats (edit, scan statistics…). */
  extraItems?: DropdownItem[];
  align?: "start" | "end";
};

/**
 * "Download ▾" with the three formats explained in plain words. Used on the QR list
 * cards and in the designer header.
 */
export function QrDownloadMenu({
  qrId,
  name,
  size,
  beforeDownload,
  buttonSize = "sm",
  variant = "secondary",
  extraItems = [],
  align = "end",
}: QrDownloadMenuProps) {
  const t = useTranslations("qr");
  const { download, pending } = useQrDownload();

  const start = (format: QrDownloadFormat): void => {
    void (async () => {
      if (beforeDownload && !(await beforeDownload())) {
        return;
      }
      await download(qrId, format, format === "svg" ? undefined : size);
    })();
  };

  const items: DropdownItem[] = [
    {
      id: "png",
      label: t("format.png"),
      description: t("format.pngShort"),
      icon: <Icon name="image" className="text-xs" />,
      onSelect: () => start("png"),
    },
    {
      id: "svg",
      label: t("format.svg"),
      description: t("format.svgShort"),
      icon: <Icon name="file-code" className="text-xs" />,
      onSelect: () => start("svg"),
    },
    {
      id: "pdf",
      label: t("format.pdf"),
      description: t("format.pdfShort"),
      icon: <Icon name="file-lines" className="text-xs" />,
      onSelect: () => start("pdf"),
    },
    ...extraItems,
  ];

  return (
    <Dropdown
      align={align}
      label={t("downloadNamed", { name })}
      items={items}
      trigger={
        <Button
          size={buttonSize}
          variant={variant}
          leadingIcon="download"
          trailingIcon="chevron-down"
          loading={pending != null}
          aria-label={t("downloadNamed", { name })}
        >
          {t("download")}
        </Button>
      }
    />
  );
}
