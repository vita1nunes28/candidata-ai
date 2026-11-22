function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}. Veja o .env.example.`);
  return v;
}
export const env = {
  supabaseUrl: () => req("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnon: () => req("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  serviceRole: () => req("SUPABASE_SERVICE_ROLE_KEY"),
  appUrl: () => (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  geminiKey: () => req("GEMINI_API_KEY"),
  geminiModel: () => process.env.GEMINI_MODEL || "gemini-2.5-flash",
  encryptionKey: () => req("ENCRYPTION_KEY"),
  googleId: () => req("GOOGLE_CLIENT_ID"),
  googleSecret: () => req("GOOGLE_CLIENT_SECRET"),
  msId: () => req("MICROSOFT_CLIENT_ID"),
  msSecret: () => req("MICROSOFT_CLIENT_SECRET"),
  adzunaId: () => process.env.ADZUNA_APP_ID || "",
  adzunaKey: () => process.env.ADZUNA_APP_KEY || "",
  cronSecret: () => req("CRON_SECRET"),
  dailyGenerations: () => Number(process.env.DAILY_GENERATION_LIMIT || 30),
};
