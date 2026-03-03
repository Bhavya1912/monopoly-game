import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// ─────────────────────────────────────────────────────────────────────────────
// Firebase configuration & initialisation
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCzd09dkugQ8DMNO-3xKEl-DDzpKS66iFw",
  authDomain: "monopoly-game-1a36c.firebaseapp.com",
  databaseURL: "https://monopoly-game-1a36c-default-rtdb.firebaseio.com",
  projectId: "monopoly-game-1a36c",
  storageBucket: "monopoly-game-1a36c.firebasestorage.app",
  messagingSenderId: "817558285705",
  appId: "1:817558285705:web:efe8bcbf7a6ec093a64558",
};

const firebaseApp = initializeApp(firebaseConfig);
export const db = getDatabase(firebaseApp);
