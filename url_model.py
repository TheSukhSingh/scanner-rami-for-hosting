import pandas as pd

def load_url_list(csv_file="url_dataset.csv"):
    try:
        # Only load relevant columns and ignore the ID
        df = pd.read_csv(csv_file, usecols=["url", "label"])
        # Clean up whitespace and lowercase (optional, depending on how consistent your list is)
        df["url"] = df["url"].str.strip()
        df["label"] = df["label"].str.strip()
        return df
    except Exception as e:
        print(f"⚠️ Could not load URL list: {e}")
        return pd.DataFrame(columns=["url", "label"])

# Load CSV once at import
url_df = load_url_list()

def check_url(url):
    cleaned_url = url.strip()
    row = url_df[url_df["url"] == cleaned_url]
    if not row.empty:
        return row.iloc[0]["label"]
    return "benign"
