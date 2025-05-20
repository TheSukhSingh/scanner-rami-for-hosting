import os
from db import init_db

if os.path.exists("scan_history.db"):
    print("🗑 Deleting old scan_history.db...")
    os.remove("scan_history.db")

print("✅ Reinitializing database...")
init_db()
print("🎉 Database reset and ready.")
