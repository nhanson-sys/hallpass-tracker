import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "hallpass-tracker-3476e.firebaseapp.com",
  databaseURL: "https://hallpass-tracker-3476e-default-rtdb.firebaseio.com",
  projectId: "hallpass-tracker-3476e",
  storageBucket: "hallpass-tracker-3476e.firebasestorage.app",
  messagingSenderId: "185741566583",
  appId: "1:185741566583:web:fafb32c73f921c01425c72"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
