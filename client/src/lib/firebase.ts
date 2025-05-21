import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAkU77KLYS1fW3nLuGs-VF1xok4FhQ_TEc",
  authDomain: "umpiluzi-fire-permits.firebaseapp.com",
  projectId: "umpiluzi-fire-permits",
  storageBucket: "umpiluzi-fire-permits.firebasestorage.app",
  messagingSenderId: "706188247136",
  appId: "1:706188247136:web:67cafa628d9b18d5928305",
  measurementId: "G-2TKP1GG0Q8"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Google Provider
const googleProvider = new GoogleAuthProvider();

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

// Sign out
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};