import type { BioPageData } from "@/components/bio/bio-page-view";
import type { BioFormValues } from "@/lib/bio-form";

/** Maps unsaved builder values onto the renderer's shape ("" → null for optional media). */
export function previewPage(values: BioFormValues, id: string, fallbackName: string): BioPageData {
  return {
    id,
    handle: values.handle,
    displayName: values.displayName.trim() || fallbackName,
    bio: values.bio,
    avatarUrl: values.avatarUrl || null,
    theme: values.theme,
    buttonStyle: values.buttonStyle,
    blocks: values.blocks,
    bgType: values.bgType,
    bgColor: values.bgColor || null,
    bgGradient: values.bgGradient || null,
    bgImageUrl: values.bgImageUrl || null,
    buttonColor: values.buttonColor || null,
    buttonTextColor: values.buttonTextColor || null,
    textColor: values.textColor || null,
    fontFamily: values.fontFamily,
    profileMode: values.profileMode,
    logoUrl: values.logoUrl || null,
    profileText: values.profileText,
    coverUrl: values.coverUrl || null,
    adsEnabled: values.adsEnabled,
    adMobileImage: values.adMobileImage || null,
    adMobileHref: values.adMobileHref || null,
    adLeftImage: values.adLeftImage || null,
    adLeftHref: values.adLeftHref || null,
    adRightImage: values.adRightImage || null,
    adRightHref: values.adRightHref || null,
    customCss: values.customCss,
  };
}
