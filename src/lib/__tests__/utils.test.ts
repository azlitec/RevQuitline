import { formatDate, calculateAge, maskEmail } from '../utils';

describe('Utils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-10-16');
      expect(formatDate(date)).toBe('16/10/2025');
    });

    it('returns empty string for invalid date', () => {
      // @ts-expect-error
      expect(formatDate('invalid')).toBe('');
    });
  });

  describe('calculateAge', () => {
    it('should calculate age from birthdate', () => {
      const birthdate = new Date('1990-01-01');
      const age = calculateAge(birthdate);
      expect(age).toBeGreaterThan(30);
    });

    it('returns 0 for invalid date', () => {
      // @ts-expect-error
      expect(calculateAge('invalid')).toBe(0);
    });
  });

  describe('maskEmail', () => {
    it('should mask email correctly', () => {
      expect(maskEmail('test@example.com')).toBe('t***@example.com');
    });

    it('returns empty string for empty email', () => {
      expect(maskEmail('')).toBe('');
    });

    it('returns original for invalid format', () => {
      expect(maskEmail('not-an-email')).toBe('not-an-email');
    });
  });
});