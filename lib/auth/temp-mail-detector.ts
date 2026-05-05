const TEMP_MAIL_DOMAINS = [
  'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'mailinator.com', 'throwaway.email', 'temp-mail.org',
  'getnada.com', 'maildrop.cc', 'trashmail.com',
  'yopmail.com', 'fakeinbox.com', 'sharklasers.com',
  'guerrillamail.info', 'grr.la', 'guerrillamail.biz',
  'guerrillamail.de', 'spam4.me', 'tmpeml.info',
  'emailondeck.com', 'mintemail.com', 'mytemp.email',
  'tempinbox.com', 'mohmal.com', 'dispostable.com',
  'mailnesia.com', 'mailcatch.com', 'throwawaymail.com',
  'tempmail.net', 'temp-mail.io', 'tempmail.de',
  'tempmail.us', 'tempmail.co', 'tempmail.email',
];

const SUSPICIOUS_PATTERNS = [
  /^temp/i,
  /^throw/i,
  /^trash/i,
  /^fake/i,
  /^spam/i,
  /^disposable/i,
  /^guerrilla/i,
  /\d{5,}/,
];

export async function isTemporaryEmail(email: string): Promise<boolean> {
  if (!email || !email.includes('@')) {
    return false;
  }

  const domain = email.split('@')[1].toLowerCase();

  if (TEMP_MAIL_DOMAINS.includes(domain)) {
    return true;
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(domain)) {
      return true;
    }
  }

  try {
    const response = await fetch(
      `https://open.kickbox.com/v1/disposable/${domain}`,
      { signal: AbortSignal.timeout(3000) }
    );

    if (response.ok) {
      const data = await response.json();
      return data.disposable === true;
    }
  } catch (error) {
    console.warn('Temp mail API check failed, using local list only');
  }

  return false;
}

export function getDomainReputation(email: string): 'trusted' | 'suspicious' | 'disposable' {
  const domain = email.split('@')[1]?.toLowerCase();

  if (!domain) return 'suspicious';

  const trustedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
  if (trustedDomains.includes(domain)) {
    return 'trusted';
  }

  if (TEMP_MAIL_DOMAINS.includes(domain)) {
    return 'disposable';
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(domain)) {
      return 'suspicious';
    }
  }

  return 'trusted';
}
