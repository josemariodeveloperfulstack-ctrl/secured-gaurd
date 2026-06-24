const { Client } = require('pg');

(async () => {
  const c = new Client({
    host: 'localhost',
    database: 'secured_guard_test',
    user: 'postgres',
    password: '1234567',
  });
  await c.connect();
  const r = await c.query(
    "SELECT username, active, status, LEFT(password, 25) AS pfx, LENGTH(password) AS len FROM users WHERE username = $1",
    ['jose.ramos']
  );
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
