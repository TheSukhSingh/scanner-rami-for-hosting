import pandas as pd
from urllib.parse import urlparse
import os
from dotenv import load_dotenv

# Load environment variables (for future use)
load_dotenv()

# ===== CATEGORY GROUPS =====
CATEGORY_GROUPS = {
    "phishing": "Social Engineering",
    "malware": "Malicious Code",
    "adware": "Annoyance",
    "spyware": "Invasive Tracking",
    "cryptomining": "Resource Abuse",
    "defacement": "Website Tampering",
    "hacking": "Unauthorized Access",
    "benign": "Other"
}

# ===== Normalize URL to domain+path =====
def extract_match_key(url):
    try:
        parsed = urlparse(url if url.startswith("http") else "http://" + url)
        netloc = parsed.netloc.strip().lower()
        path = parsed.path.rstrip('/').lower()
        return f"{netloc}{path}"
    except:
        return ""

# ===== Load enriched local URL list =====
def load_url_list(csv_file="url_list.csv"):
    try:
        df = pd.read_csv(csv_file, dtype=str)
        df["url"] = df["url"].str.strip().str.lower()
        df["label"] = df["label"].str.strip().str.lower()
        df["match_key"] = df["url"].apply(extract_match_key)
        df = df.drop_duplicates(subset="match_key")  # ensure uniqueness
        return df
    except Exception as e:
        print(f"⚠️ Failed to load CSV: {e}")
        return pd.DataFrame(columns=[
            "url", "label", "confidence_score", "source",
            "tags", "threat_type", "discovered_on", "notes", "match_key"
        ])

# ===== Load and structure the data =====
url_df = load_url_list()
url_dict = url_df.set_index("match_key").to_dict("index")

# ===== Main threat check function =====
def check_url(user_input):
    match_key = extract_match_key(user_input)
    entry = url_dict.get(match_key)

    if not match_key or not entry:
        return {
            "url": user_input,
            "label": "benign",
            "matched_against": None,
            "group": "Other",
            "confidence_score": None,
            "tags": [],
            "threat_type": None,
            "source": "unknown",
            "discovered_on": None,
            "notes": "No threat found in local dataset."
        }

    label = entry.get("label", "benign").lower()
    return {
        "url": user_input,
        "label": label,
        "matched_against": entry.get("url"),
        "group": CATEGORY_GROUPS.get(label, "Other"),
        "confidence_score": int(entry.get("confidence_score", 0)),
        "tags": entry.get("tags", "").split(","),
        "threat_type": entry.get("threat_type"),
        "source": entry.get("source"),
        "discovered_on": entry.get("discovered_on"),
        "notes": entry.get("notes")
    }
