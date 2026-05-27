#!/usr/bin/env python3
"""Pull all data from the live Emergent EduLynk API and insert into local MongoDB."""

import requests
import pymongo
import json
import sys

BASE_URL = "https://batch-update-v1.emergent.host/api"
LOCAL_MONGO = "mongodb://localhost:27017"
LOCAL_DB = "stemxplore_local"
ADMIN_EMAIL = "ca.ankurnagaria@gmail.com"
ADMIN_PASSWORD = "Chartered@1"

# Collection-endpoint pairs: (local collection name, API path)
COLLECTIONS = [
    ("users",           "/admin/all-users"),
    ("parents",         "/parents"),
    ("students",        "/students"),
    ("teachers",        "/teachers"),
    ("classes",         "/classes"),
    ("attendance",      "/attendance"),
    ("invoices",        "/invoices"),
    ("payments",        "/payments"),
    ("events",          "/events"),
    ("announcements",   "/announcements"),
    ("accounts",        "/accounts"),
    ("transactions",    "/transactions"),
    ("expenses",        "/expenses"),
    ("student_groups",  "/student-groups"),
    ("settings",        "/settings"),
]

def login():
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    resp.raise_for_status()
    token = resp.json().get("token")
    if not token:
        print("Login failed — no token returned")
        print(resp.json())
        sys.exit(1)
    print(f"Logged in as {ADMIN_EMAIL}")
    return token

def fetch(path, headers):
    resp = requests.get(f"{BASE_URL}{path}", headers=headers, timeout=30)
    if resp.status_code != 200:
        print(f"  WARN: {path} returned {resp.status_code}")
        return None
    data = resp.json()
    # Settings endpoint returns a single object, not a list
    if isinstance(data, dict):
        data = [data]
    return data

def migrate():
    token = login()
    headers = {"Authorization": f"Bearer {token}"}

    client = pymongo.MongoClient(LOCAL_MONGO)
    db = client[LOCAL_DB]

    for collection_name, path in COLLECTIONS:
        print(f"Fetching {path} ...", end=" ", flush=True)
        docs = fetch(path, headers)
        if docs is None:
            print("skipped")
            continue
        if not docs:
            print("0 records")
            continue

        col = db[collection_name]
        col.delete_many({})  # clear existing before re-import
        # Remove _id field so MongoDB generates new ones (avoids conflicts)
        for doc in docs:
            doc.pop("_id", None)
        col.insert_many(docs)
        print(f"{len(docs)} records")

    client.close()
    print("\nMigration complete. Database:", LOCAL_DB)

if __name__ == "__main__":
    migrate()
