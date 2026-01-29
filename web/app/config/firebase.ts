import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHc9U45K_EEYs3yJUAcx9iAkONbk2-XMI",
  authDomain: "weekly-8b4b1.firebaseapp.com",
  projectId: "weekly-8b4b1",
  storageBucket: "weekly-8b4b1.firebasestorage.app",
  messagingSenderId: "825622554318",
  appId: "1:825622554318:web:b4fc3e6cc491ab9496929f",
  measurementId: "G-L3W0DZ9CPK"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

if (typeof window !== "undefined") {
  getAnalytics(app);
}

export const db = getFirestore(app);
export const auth = getAuth(app);