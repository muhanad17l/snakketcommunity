import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCiiuXwVhbCeFOA1Hed6Fx_1ElkWGeUjY",
  authDomain: "snakket-community.firebaseapp.com",
  projectId: "snakket-community",
  storageBucket: "",
  messagingSenderId: "2081259663",
  appId: "1:2081259663:web:978dd76f7a6eb8985130fa",
  measurementId: "G-YYFJTCEJEM"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };