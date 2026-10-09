// Vitest global setup (runs before every test file in every worker).
// Guarantees test env vars (JWT_SECRET, ...) are loaded no matter which
// test file imports the app module, so the fail-fast config validation
// never breaks the suite.
require('dotenv').config({ path: '.env.test' });
