import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface TwoFactorSecret {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export async function generate2FASecret(userId: string, email: string): Promise<TwoFactorSecret> {
  const secret = speakeasy.generateSecret({
    name: `YouTube Finder (${email})`,
    issuer: 'YouTube Finder',
    length: 32,
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

  const backupCodes = generateBackupCodes(8);

  return {
    secret: secret.base32!,
    qrCode,
    backupCodes,
  };
}

export function verify2FAToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2,
  });
}

export function verifyBackupCode(storedCodes: string[], providedCode: string): boolean {
  const normalizedProvided = providedCode.replace(/\s|-/g, '').toUpperCase();
  return storedCodes.some(code =>
    code.replace(/\s|-/g, '').toUpperCase() === normalizedProvided
  );
}

export function removeUsedBackupCode(storedCodes: string[], usedCode: string): string[] {
  const normalizedUsed = usedCode.replace(/\s|-/g, '').toUpperCase();
  return storedCodes.filter(code =>
    code.replace(/\s|-/g, '').toUpperCase() !== normalizedUsed
  );
}

function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 36).toString(36).toUpperCase()
    ).join('');

    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    codes.push(formatted);
  }

  return codes;
}

export function getCurrentToken(secret: string): string {
  return speakeasy.totp({
    secret,
    encoding: 'base32',
  });
}
