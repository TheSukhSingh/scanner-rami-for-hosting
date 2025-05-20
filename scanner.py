import requests
import logging
import os
import time
import ipaddress
import json
from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime
from ipwhois import IPWhois
from dotenv import load_dotenv

# === Load environment variables ===
load_dotenv()

# === API KEYS ===
ABUSEIPDB_API_KEY = os.getenv("ABUSEIPDB_API_KEY")
GREYNOISE_API_KEY = os.getenv("GREYNOISE_API_KEY")
IPINFO_API_KEY = os.getenv("IPINFO_API_KEY")
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")

# === CONSTANTS ===
LOCAL_IP_FILE = "ip_hist.csv"

# === LOGGING SETUP ===
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler("ip_checker.log"),
        logging.StreamHandler()
    ]
)

# === IP Info Data Class ===
@dataclass
class IPProfile:
    ip: str
    abuse_score: Optional[int] = None
    abuse_reports: Optional[int] = None
    abuse_last_reported: Optional[str] = None
    abuse_risk: Optional[str] = None
    greynoise_classification: Optional[str] = None
    greynoise_tags: List[str] = field(default_factory=list)
    is_tor_exit: Optional[bool] = None
    whois_asn: Optional[str] = None
    whois_org: Optional[str] = None
    whois_country: Optional[str] = None
    whois_desc: Optional[str] = None
    whois_failed: Optional[str] = None
    ipinfo_city: Optional[str] = None
    ipinfo_region: Optional[str] = None
    ipinfo_country: Optional[str] = None
    ipinfo_hostname: Optional[str] = None
    ipinfo_org: Optional[str] = None
    ipinfo_asn: Optional[str] = None
    risk_tags: List[str] = field(default_factory=list)
    vt_malicious_count: Optional[int] = 0
    vt_suspicious_count: Optional[int] = 0
    vt_detected_vendors: List[str] = field(default_factory=list)
    vt_categories: List[str] = field(default_factory=list)
    vt_reputation: Optional[int] = None
    vt_tags: List[str] = field(default_factory=list)
    found_in_local_list: bool = False

# === Utility Functions ===

def is_valid_ip(ip: str) -> bool:
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False

def load_local_ip_list(filename: str) -> set:
    local_ips = set()
    try:
        with open(filename, "r", encoding="utf-8") as f:
            for line in f:
                ip = line.strip()
                if ip and is_valid_ip(ip):
                    local_ips.add(ip)
    except Exception as e:
        logging.warning(f"Failed to load local IP list: {e}")
    return local_ips

def safe_api_call(func):
    try:
        return func()
    except Exception as e:
        logging.warning(f"API call failed: {e}")
        return None

def get_tor_exit_nodes():
    def fetch():
        r = requests.get("https://check.torproject.org/exit-addresses", timeout=10)
        r.raise_for_status()
        return {line.split()[1] for line in r.text.splitlines() if line.startswith("ExitAddress")}
    return safe_api_call(fetch) or set()

def scan_ip(ip: str, tor_nodes: set, local_ip_set: set) -> IPProfile:
    time.sleep(1)
    profile = IPProfile(ip=ip)

    if ip in local_ip_set:
        profile.found_in_local_list = True

    # === External API checks ===

    # AbuseIPDB
    def fetch_abuseipdb():
        r = requests.get(
            "https://api.abuseipdb.com/api/v2/check",
            headers={"Key": ABUSEIPDB_API_KEY, "Accept": "application/json"},
            params={"ipAddress": ip, "maxAgeInDays": 90}
        )
        r.raise_for_status()
        return r.json()

    abuse_data = safe_api_call(fetch_abuseipdb)
    if abuse_data:
        data = abuse_data["data"]
        profile.abuse_score = data.get("abuseConfidenceScore", 0)
        profile.abuse_reports = data.get("totalReports", 0)
        profile.abuse_last_reported = data.get("lastReportedAt", "N/A")
        profile.abuse_risk = "MALICIOUS" if profile.abuse_score >= 20 else "SAFE"

    # GreyNoise
    def fetch_greynoise():
        r = requests.get(
            f"https://api.greynoise.io/v3/community/{ip}",
            headers={"key": GREYNOISE_API_KEY, "Accept": "application/json"},
            timeout=10
        )
        if r.status_code == 200:
            return r.json()
        return None

    greynoise_data = safe_api_call(fetch_greynoise)
    if greynoise_data:
        profile.greynoise_classification = greynoise_data.get("classification")
        profile.greynoise_tags = greynoise_data.get("tags", [])

    # WHOIS
    def fetch_whois():
        obj = IPWhois(ip)
        return obj.lookup_rdap()

    whois_data = safe_api_call(fetch_whois)
    if whois_data:
        profile.whois_asn = whois_data.get("asn")
        profile.whois_org = whois_data.get("network", {}).get("name")
        profile.whois_country = whois_data.get("asn_country_code")
        profile.whois_desc = whois_data.get("network", {}).get("description")
    else:
        profile.whois_failed = "WHOIS Lookup Failed"

    # IPInfo
    def fetch_ipinfo():
        r = requests.get(f"https://ipinfo.io/{ip}/json?token={IPINFO_API_KEY}", timeout=10)
        if r.status_code == 200:
            return r.json()
        return None

    ipinfo_data = safe_api_call(fetch_ipinfo)
    if ipinfo_data:
        profile.ipinfo_city = ipinfo_data.get("city")
        profile.ipinfo_region = ipinfo_data.get("region")
        profile.ipinfo_country = ipinfo_data.get("country")
        profile.ipinfo_hostname = ipinfo_data.get("hostname")
        profile.ipinfo_org = ipinfo_data.get("org")
        if isinstance(ipinfo_data.get("asn"), dict):
            profile.ipinfo_asn = ipinfo_data["asn"].get("asn")

    # VirusTotal
    def fetch_virustotal():
        r = requests.get(
            f"https://www.virustotal.com/api/v3/ip_addresses/{ip}",
            headers={"x-apikey": VIRUSTOTAL_API_KEY},
            timeout=10
        )
        r.raise_for_status()
        return r.json()

    vt_data = safe_api_call(fetch_virustotal)
    if vt_data:
        analysis = vt_data.get("data", {}).get("attributes", {})
        profile.vt_malicious_count = analysis.get("last_analysis_stats", {}).get("malicious", 0)
        profile.vt_suspicious_count = analysis.get("last_analysis_stats", {}).get("suspicious", 0)
        vendors = analysis.get("last_analysis_results", {})
        profile.vt_detected_vendors = [vendor for vendor, result in vendors.items() if result["category"] == "malicious"][:7]
        profile.vt_categories = list(analysis.get("categories", {}).values())[:5]
        profile.vt_reputation = analysis.get("reputation", 0)
        profile.vt_tags = analysis.get("tags", [])[:5]

    profile.is_tor_exit = ip in tor_nodes
    return profile
