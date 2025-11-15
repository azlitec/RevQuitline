// Simple env validation - just for demo
export function validateEnv() {
  // Skip on client
  if (typeof window !== 'undefined') {
    return { valid: true, errors: [], warnings: [] };
  }
  
  // Just log, don't throw errors
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set');
  }
  if (!process.env.NEXTAUTH_SECRET) {
    console.log('⚠️  NEXTAUTH_SECRET not set');
  }
  
  return { valid: true, errors: [], warnings: [] };
}
