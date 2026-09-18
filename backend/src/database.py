import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    cred = credentials.Certificate("ranked-game-da48a-firebase-adminsdk-fbsvc-c83e6d2f58.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()