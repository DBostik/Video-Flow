import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCm3OSP4QS85i9bUfpJw7dDTPbktW3MQD4",
  authDomain: "vidtracker-c8ebd.firebaseapp.com",
  projectId: "vidtracker-c8ebd",
  storageBucket: "vidtracker-c8ebd.firebasestorage.app",
  messagingSenderId: "449634150358",
  appId: "1:449634150358:web:2034039976b53326b1a677"
};

// Initialize variables
let app;
let db: any;
let auth: any;
let googleProvider: any;

try {
  // Attempt to connect
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  console.log("✅ Firebase connection established!");
} catch (error) {
  // If it fails, log it but DO NOT CRASH the app
  console.error("❌ Firebase connection failed:", error);
}

// Export the services (might be undefined if failed, but won't crash import)
export { db, auth, googleProvider };