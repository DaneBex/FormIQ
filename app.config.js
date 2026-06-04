// Expo CLI automatically loads .env.local before evaluating this file,
// so process.env.* below reads from your .env.local without any extra packages.
const base = require('./app.json').expo;

module.exports = () => ({
  ...base,
  extra: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    revenueCatIosKey: process.env.REVENUECAT_IOS_API_KEY,
  },
});
