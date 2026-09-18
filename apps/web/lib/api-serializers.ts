import type { DomainRow, QrCodeRow } from "@short/db";
import type { BiopageListRow } from "./biopages";
import type { LinkWithDomain } from "./links";
import { shortUrl } from "./links";

export type LinkResource = ReturnType<typeof serializeLink>;

/** The public shape of a link. `passwordHash` and internal ids never leave the server. */
export function serializeLink(link: LinkWithDomain) {
  return {
    id: link.id,
    slug: link.slug,
    hostname: link.hostname,
    shortUrl: shortUrl(link.hostname, link.slug),
    destination: link.destination,
    title: link.title,
    description: link.description,
    image: link.image,
    tags: link.tags,
    domainId: link.domainId,
    folderId: link.folderId,
    rules: link.rules,
    abVariants: link.abVariants,
    utm: link.utm,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    expiredDestination: link.expiredDestination,
    passwordProtected: link.passwordHash !== null,
    iosDestination: link.iosDestination,
    androidDestination: link.androidDestination,
    cloaked: link.cloaked,
    noIndex: link.noIndex,
    forwardQuery: link.forwardQuery,
    archived: link.archived,
    disabled: link.disabledAt !== null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

export function serializeDomain(domain: DomainRow) {
  return {
    id: domain.id,
    hostname: domain.hostname,
    status: domain.status,
    sslStatus: domain.sslStatus,
    isPlatform: domain.isPlatform,
    isDefault: domain.isDefault,
    rootDestination: domain.rootDestination,
    notFoundDestination: domain.notFoundDestination,
    verifiedAt: domain.verifiedAt?.toISOString() ?? null,
    createdAt: domain.createdAt.toISOString(),
  };
}

export function serializeQrCode(qr: QrCodeRow) {
  return {
    id: qr.id,
    name: qr.name,
    linkId: qr.linkId,
    payloadKind: qr.payloadKind,
    payload: qr.payload,
    style: qr.style,
    createdAt: qr.createdAt.toISOString(),
    updatedAt: qr.updatedAt.toISOString(),
  };
}

export function serializeBiopage(page: BiopageListRow) {
  return {
    id: page.id,
    handle: page.handle,
    hostname: page.hostname,
    url: `https://${page.hostname}/${page.handle}`,
    displayName: page.displayName,
    bio: page.bio,
    theme: page.theme,
    buttonStyle: page.buttonStyle,
    published: page.published,
    profileMode: page.profileMode,
    sensitive: page.sensitive,
    blockCount: page.blockCount,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}
