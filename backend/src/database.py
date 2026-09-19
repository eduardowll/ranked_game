import os
import json

import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    credentials_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    if credentials_json:
        cred = credentials.Certificate(json.loads(credentials_json))
    else:
        credentials_path = os.getenv(
            "FIREBASE_CREDENTIALS_PATH",
            "ranked-game-da48a-firebase-adminsdk-fbsvc-c83e6d2f58.json",
        )
        cred = credentials.Certificate(credentials_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()