import { EyesoneScope } from "@/components/catalog/eyesone-scope";
import type { ReactNode } from "react";
import "@/styles/kit/index.css";

type DocsLayoutProps = {
  children: ReactNode;
};

export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
      />
      <EyesoneScope>{children}</EyesoneScope>
    </>
  );
}
