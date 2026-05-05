import { validatePassword } from '@/lib/auth/password-validator';

describe('Password Validator', () => {
  describe('validatePassword', () => {
    it('should accept a strong password', () => {
      const result = validatePassword('MySecureP@ssw0rd123');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('strong');
    });

    it('should reject password shorter than 12 characters', () => {
      const result = validatePassword('Short1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be at least 12 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePassword('mypassword123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePassword('MYPASSWORD123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePassword('MyPassword!@#');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePassword('MyPassword123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must contain at least one special character');
    });

    it('should reject common passwords', () => {
      const result = validatePassword('Password123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is too common');
    });

    it('should reject passwords with repeating characters', () => {
      const result = validatePassword('MyPasssss123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Avoid repeating characters');
    });

    it('should calculate strength correctly for weak password', () => {
      const result = validatePassword('Abcdefgh1234');

      expect(result.strength).toBe('weak');
      expect(result.score).toBeLessThan(40);
    });

    it('should calculate strength correctly for medium password', () => {
      const result = validatePassword('MyPassword123!');

      expect(result.strength).toBe('medium');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(60);
    });

    it('should calculate strength correctly for strong password', () => {
      const result = validatePassword('MyS3cur3P@ssw0rd!');

      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThan(80);
    });

    it('should calculate strength correctly for very strong password', () => {
      const result = validatePassword('MyV3ry$tr0ng&Un1qu3P@ssw0rd!2024');

      expect(result.strength).toBe('very-strong');
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('should handle edge case of exactly 12 characters', () => {
      const result = validatePassword('MyPass123!@#');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject all-numeric password', () => {
      const result = validatePassword('123456789012');

      expect(result.valid).toBe(false);
      expect(result.score).toBeLessThan(40);
    });

    it('should reject all-alphabetic password', () => {
      const result = validatePassword('AbcdefghijklMNOP');

      expect(result.valid).toBe(false);
      expect(result.score).toBeLessThan(40);
    });
  });
});
