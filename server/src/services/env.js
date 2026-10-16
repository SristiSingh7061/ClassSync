// Refuse to start in production with unsafe settings.
function checkEnv(env = process.env) {
  const problems = [];
  if (!env.DATABASE_URL) problems.push('DATABASE_URL missing');
  if (!env.JWT_SECRET) problems.push('JWT_SECRET missing');
  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET && (env.JWT_SECRET.length < 32 || /change_this|secret_key|classsync_super/i.test(env.JWT_SECRET)))
      problems.push('JWT_SECRET is too weak for production (use 48+ random characters)');
    if (!env.CLIENT_URL) problems.push('CLIENT_URL missing (set it to your Vercel link)');
    if (env.ADMIN_PASSWORD === 'ChangeMe123') problems.push('ADMIN_PASSWORD is still the default');
  }
  return problems;
}
module.exports = { checkEnv };
