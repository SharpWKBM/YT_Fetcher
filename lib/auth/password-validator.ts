export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
}

const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
  'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
  'bailey', 'passw0rd', 'shadow', '123123', '654321',
];

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 12) {
    errors.push('Must be at least 12 characters long');
  } else {
    score += Math.min(password.length - 12, 8);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  } else {
    score += 10;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  } else {
    score += 10;
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one number');
  } else {
    score += 10;
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Must contain at least one special character');
  } else {
    score += 15;
  }

  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
    errors.push('Password is too common');
    score -= 20;
  }

  if (/(.)\1{2,}/.test(password)) {
    errors.push('Avoid repeating characters');
    score -= 10;
  }

  if (/^[0-9]+$/.test(password) || /^[A-Za-z]+$/.test(password)) {
    score -= 15;
  }

  const uniqueChars = new Set(password).size;
  score += Math.min(uniqueChars * 2, 20);

  score = Math.max(0, Math.min(100, score));

  let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score < 40) strength = 'weak';
  else if (score < 60) strength = 'medium';
  else if (score < 80) strength = 'strong';
  else strength = 'very-strong';

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

export function generateStrongPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = uppercase + lowercase + numbers + special;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}
