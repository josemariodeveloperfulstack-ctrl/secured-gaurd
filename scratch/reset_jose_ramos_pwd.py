import bcrypt
import psycopg2

USERNAME = "jose.ramos"
PASSWORD = "Admin1234"

password_hash = bcrypt.hashpw(PASSWORD.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")

conn = psycopg2.connect(
    host="localhost",
    dbname="secured_guard_test",
    user="postgres",
    password="1234567",
)
cur = conn.cursor()

cur.execute(
    "SELECT username, active, status, first_access, two_factor_enabled, password "
    "FROM users WHERE username = %s",
    (USERNAME,),
)
before = cur.fetchone()
print("BEFORE:", before[0], before[1], before[2], before[3], before[4], before[5][:30] + "...")

cur.execute(
    """
    UPDATE users
    SET password = %s,
        active = true,
        status = 'ACTIVE',
        first_access = false,
        two_factor_enabled = false
    WHERE username = %s
    """,
    (password_hash, USERNAME),
)
print("UPDATED ROWS:", cur.rowcount)
conn.commit()

cur.execute(
    "SELECT username, password FROM users WHERE username = %s",
    (USERNAME,),
)
row = cur.fetchone()
stored = row[1]
print("STORED PREFIX:", stored[:30])
print("VERIFY:", bcrypt.checkpw(PASSWORD.encode("utf-8"), stored.encode("utf-8")))

conn.close()
print("DONE - login with", USERNAME, "/", PASSWORD)
