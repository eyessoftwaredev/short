import { EyesoneScope } from "@/components/catalog/eyesone-scope";
import type { ReactNode } from "react";
import "@/styles/kit/index.css";

type DocsLayoutProps = {
  children: ReactNode;
};

export default function DocsLayout({ children }: DocsLayoutProps) {
  return <EyesoneScope>{children}</EyesoneScope>;
}
