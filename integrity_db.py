# integrity_db.py  (adapted from turn21file3)
import sqlite3
from datetime import datetime

DB_NAME = 'scan_history.db'

def init_db():
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT,
                sha256 TEXT,
                status TEXT,
                timestamp TEXT,
                full_hashes TEXT,
                vt_summary TEXT,
                vt_verdict TEXT,
                vt_url TEXT
            )
        ''')

def save_scan(filename, sha256, status, hashes_dict, vt_summary, vt_verdict, vt_url):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    formatted = '\n'.join([f"{key:<7}: {value}" for key, value in hashes_dict.items()])
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute('''
            INSERT INTO scans (
                filename, sha256, status, timestamp, full_hashes,
                vt_summary, vt_verdict, vt_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (filename, sha256, status, timestamp, formatted, vt_summary, vt_verdict, vt_url))

def get_filtered_scans(sort_by='time', date_filter=None):
    query = "SELECT * FROM scans"
    conditions, params = [], []
    if date_filter:
        conditions.append("timestamp >= ?")
        params.append(date_filter + " 00:00:00")
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY " + ("status ASC, timestamp DESC" if sort_by=='status' 
                              else "timestamp DESC")
    with sqlite3.connect(DB_NAME) as conn:
        conn.row_factory = sqlite3.Row
        return conn.execute(query, params).fetchall()

def delete_scan(scan_id):
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute('DELETE FROM scans WHERE id = ?', (scan_id,))

def delete_all_scans():
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute('DELETE FROM scans')
