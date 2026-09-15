import catalogMeta from "@/data/catalog.json";

export type SectionMeta = {
  id: string;
  slug: string;
  num: string;
  title: string;
  heading: string;
  blurb: string;
};

export function getSectionMeta(id: string): SectionMeta {
  const meta = catalogMeta.find((s) => s.id === id);
  if (!meta) {
    throw new Error(`Unknown catalog section: ${id}`);
  }
  return meta;
}
