import sys
try:
    import psycopg2
except ImportError:
    print("NO_PSYCOPG2")
    sys.exit(2)

conn = psycopg2.connect(
    host="localhost",
    dbname="secured_guard_test",
    user="postgres",
    password="1234567",
)
cur = conn.cursor()
cur.execute(
    "SELECT username, active, status, LEFT(password, 20) AS pfx, LENGTH(password) AS len "
    "FROM users WHERE username = %s",
    ("jose.ramos",),
)
rows = cur.fetchall()
print("ROWS:", rows)
conn.close()
