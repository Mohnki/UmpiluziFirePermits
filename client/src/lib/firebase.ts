import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type User,
  AuthError
} from "firebase/auth";

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

// Create a new user with email and password
export const registerWithEmailPassword = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update the user profile with display name
    await updateProfile(userCredential.user, { displayName });
    return userCredential.user;
  } catch (error) {
    console.error("Error registering with email/password:", error);
    throw error;
  }
};

// Sign in with email and password
export const signInWithEmailPassword = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in with email/password:", error);
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

// Get readable error message from Firebase Auth errors
export const getAuthErrorMessage = (error: AuthError) => {
  const errorMap: Record<string, string> = {
    'auth/email-already-in-use': 'Email address is already in use.',
    'auth/invalid-email': 'Email address is invalid.',
    'auth/weak-password': 'Password is too weak. It should be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many unsuccessful login attempts. Please try again later.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'Operation not allowed.',
    'auth/popup-closed-by-user': 'Login popup was closed before completion.'
  };
  
  return errorMap[error.code] || 'An unknown error occurred. Please try again.';
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};