import sqlite3
import json
from datetime import datetime
import logging
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_FILE = os.getenv("SCAN_RESULTS_DB", os.path.join(BASE_DIR, "scan_results.db"))
 

def init_db():
    try:
        with sqlite3.connect(DB_FILE) as conn:
            c = conn.cursor()
            # IP scans table
            c.execute("""
                CREATE TABLE IF NOT EXISTS scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip TEXT NOT NULL,
                    profile TEXT NOT NULL,
                    scanned_at TEXT NOT NULL
                )
            """)
            # URL scans table
            c.execute("""
                CREATE TABLE IF NOT EXISTS url_scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL,
                    data TEXT NOT NULL,
                    scanned_at TEXT NOT NULL
                )
            """)
    except sqlite3.Error as e:
        logging.error("Failed initializing scan_results.db: %s", e)

# ✅ Save IP scan
def save_scan(ip, profile_dict):
    try:
        with sqlite3.connect(DB_FILE) as conn:
            c = conn.cursor()
            c.execute(
                "INSERT INTO scans (ip, profile, scanned_at) VALUES (?, ?, ?)",
                (ip, json.dumps(profile_dict), datetime.utcnow().isoformat())
            )
    except sqlite3.Error as e:
        logging.error("Failed saving IP scan for %s: %s", ip, e)

# ✅ Get IP scan history
def get_scan_history():
    try:
        with sqlite3.connect(DB_FILE) as conn:
            c = conn.cursor()
            c.execute(
                "SELECT ip, profile, scanned_at FROM scans ORDER BY scanned_at DESC"
            )
            rows = c.fetchall()
    except sqlite3.Error as e:
        logging.error("Failed fetching scan history: %s", e)
        return []

    result = []
    for ip, profile_json, scanned_at in rows:
        try:
            profile = json.loads(profile_json)
            abuse_risk = profile.get("abuse_risk", "Unknown")
            result.append({
                "ip": ip,
                "profile": profile,
                "abuse_risk": abuse_risk,
                "scanned_at": scanned_at
            })
        except:
            logging.warning("Corrupt profile JSON for IP %s, skipping", ip)
            continue
    return result

# ✅ Save URL scan
def save_url_scan(url, data_dict):
    try:
        with sqlite3.connect(DB_FILE) as conn:
            c = conn.cursor()
            c.execute(
                "INSERT INTO url_scans (url, data, scanned_at) VALUES (?, ?, ?)",
                (url, json.dumps(data_dict), datetime.utcnow().isoformat())
            )
    except sqlite3.Error as e:
        logging.error("Failed saving URL scan for %s: %s", url, e)


# ✅ Get URL scan history
def get_url_scan_history():
    try:
        with sqlite3.connect(DB_FILE) as conn:
            c = conn.cursor()
            c.execute(
                "SELECT url, data, scanned_at FROM url_scans ORDER BY scanned_at DESC"
            )
            rows = c.fetchall()
    except sqlite3.Error as e:
        logging.error("Failed fetching URL scan history: %s", e)
        return []

    results = []
    for url, data_json, scanned_at in rows:
        try:
            profile = json.loads(data_json)
            profile["url"] = url
            profile["scanned_at"] = scanned_at
            results.append(profile)
        except:
            logging.warning("Corrupt profile JSON for URL %s, skipping", url)
            continue
    return results
