/**
 * Email domain policy for organization claiming.
 *
 * The first verified user from a domain claims it and becomes owner, and
 * later arrivals from that domain join automatically. That is only safe when
 * the domain actually represents one organization, so consumer mailbox
 * providers and disposable-address services are excluded: without this, the
 * first person to register with a gmail.com address would own every other
 * Gmail user's continuity plan.
 */

/**
 * Public mailbox providers. Anyone signing up with one of these gets a
 * private single-member organization instead of a shared domain claim.
 */
const CONSUMER_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.co.uk',
  'ymail.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'gmx.com',
  'gmx.de',
  'gmx.net',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'fastmail.com',
  'hey.com',
  'tutanota.com',
  'tuta.io',
  'qq.com',
  '163.com',
  '126.com',
  'naver.com',
  'daum.net',
  'comcast.net',
  'verizon.net',
  'att.net',
  'sbcglobal.net',
  'bellsouth.net',
  'cox.net',
  'charter.net',
  'btinternet.com',
  'sky.com',
  'orange.fr',
  'free.fr',
  'web.de',
  't-online.de',
  'libero.it',
  'bigpond.com',
  'optusnet.com.au',
  'shaw.ca',
  'rogers.com',
  'telus.net',
]);

/** Throwaway-address services; never a real organization. */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'sharklasers.com',
  '10minutemail.com',
  'temp-mail.org',
  'tempmail.com',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'fakeinbox.com',
  'mailnesia.com',
  'spamgourmet.com',
  'mintemail.com',
  'moakt.com',
  'emailondeck.com',
]);

/** Reserved by RFC 2606 and RFC 6761; used in our own sample data. */
const RESERVED_TLDS = ['.test', '.example', '.invalid', '.localhost'];

export function normalizeDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 0 || at === email.length - 1) return null;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
  if (domain === '' || !domain.includes('.') || /\s/.test(domain)) return null;
  return domain;
}

export type DomainVerdict =
  | { claimable: true; domain: string }
  | { claimable: false; domain: string | null; reason: DomainRejection };

export type DomainRejection =
  | 'malformed'
  | 'unverified_email'
  | 'consumer_mailbox'
  | 'disposable'
  | 'reserved';

export const DOMAIN_REJECTION_MESSAGES: Record<DomainRejection, string> = {
  malformed: 'That address does not carry a usable domain.',
  unverified_email:
    'Confirm your email address before joining a shared organization; until then your workspace is private to you.',
  consumer_mailbox:
    'Personal mailbox providers are not treated as organizations, so this workspace is private to you. Sign in with a work address to join or create a shared organization.',
  disposable:
    'Disposable address services cannot claim an organization; this workspace is private to you.',
  reserved:
    'Reserved and example domains cannot claim an organization; this workspace is private to you.',
};

/**
 * Whether an address may claim or join a shared organization. Anything that
 * comes back not claimable still gets a workspace, just a private one.
 */
export function evaluateDomain(email: string, emailVerified: boolean): DomainVerdict {
  const domain = normalizeDomain(email);
  if (!domain) return { claimable: false, domain: null, reason: 'malformed' };
  if (!emailVerified) return { claimable: false, domain, reason: 'unverified_email' };
  if (CONSUMER_DOMAINS.has(domain)) {
    return { claimable: false, domain, reason: 'consumer_mailbox' };
  }
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { claimable: false, domain, reason: 'disposable' };
  }
  if (RESERVED_TLDS.some((tld) => domain.endsWith(tld))) {
    return { claimable: false, domain, reason: 'reserved' };
  }
  return { claimable: true, domain };
}

/** Display name guess for a freshly claimed domain, e.g. acme.com -> Acme. */
export function organizationNameFromDomain(domain: string): string {
  const label = domain.split('.')[0] ?? domain;
  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
