import { isTemporaryEmail } from '@/lib/auth/temp-mail-detector';

describe('Temporary Email Detector', () => {
  describe('isTemporaryEmail', () => {
    it('should detect known temporary email domains', async () => {
      const tempEmails = [
        'user@tempmail.com',
        'test@10minutemail.com',
        'spam@guerrillamail.com',
        'fake@mailinator.com',
        'throwaway@throwaway.email',
      ];

      for (const email of tempEmails) {
        const result = await isTemporaryEmail(email);
        expect(result).toBe(true);
      }
    });

    it('should accept legitimate email domains', async () => {
      const legitEmails = [
        'user@gmail.com',
        'test@outlook.com',
        'business@company.com',
        'admin@example.org',
      ];

      for (const email of legitEmails) {
        const result = await isTemporaryEmail(email);
        expect(result).toBe(false);
      }
    });

    it('should handle email addresses with uppercase', async () => {
      const result = await isTemporaryEmail('USER@TEMPMAIL.COM');
      expect(result).toBe(true);
    });

    it('should handle email addresses with mixed case', async () => {
      const result = await isTemporaryEmail('User@TempMail.Com');
      expect(result).toBe(true);
    });

    it('should detect disposable email patterns', async () => {
      const disposableEmails = [
        'user@temp-mail.org',
        'test@disposable.com',
        'fake@yopmail.com',
      ];

      for (const email of disposableEmails) {
        const result = await isTemporaryEmail(email);
        expect(result).toBe(true);
      }
    });

    it('should handle invalid email format gracefully', async () => {
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'user@',
      ];

      for (const email of invalidEmails) {
        await expect(isTemporaryEmail(email)).resolves.not.toThrow();
      }
    });
  });
});
