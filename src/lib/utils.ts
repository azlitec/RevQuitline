export function formatDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = String(d.getUTCFullYear());
  return `${day}/${month}/${year}`;
}

export function calculateAge(birthdate: Date | string | number): number {
  const b = birthdate instanceof Date ? birthdate : new Date(birthdate);
  if (isNaN(b.getTime())) return 0;
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export function maskEmail(email: string): string {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
    return email;
  }
  const local = parts[0];
  const first = local[0];
  const maskedLocal = `${first}***`;
  return `${maskedLocal}@${parts[1]}`;
}