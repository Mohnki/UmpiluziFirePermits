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
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { UserRole } from "./roles";

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
export const firestore = getFirestore(app);

// Google Provider
const googleProvider = new GoogleAuthProvider();

// User roles collection reference
const usersCollection = collection(firestore, "users");

// Create or update user profile in Firestore
export const createUserProfile = async (user: User, additionalData?: Partial<UserProfile>) => {
  if (!user.uid) return;

  const userRef = doc(firestore, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { email, displayName, photoURL } = user;
    const createdAt = new Date();

    try {
      // By default, new users are assigned the 'user' role
      const userData: UserProfile = {
        uid: user.uid,
        email: email || "",
        displayName: displayName || "",
        photoURL: photoURL || "",
        role: "user", // Default role
        createdAt,
        ...additionalData
      };

      await setDoc(userRef, userData);
      return userData;
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  } else {
    // User already exists, return the existing data
    return snapshot.data() as UserProfile;
  }
};

// Get user profile from Firestore
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(firestore, "users", uid);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      return snapshot.data() as UserProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

// Update user role
export const updateUserRole = async (uid: string, role: UserRole) => {
  try {
    const userRef = doc(firestore, "users", uid);
    await updateDoc(userRef, { role });
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

// Get all users (for admin purposes)
export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const usersSnapshot = await getDocs(usersCollection);
    return usersSnapshot.docs.map(doc => doc.data() as UserProfile);
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Create or update user profile in Firestore
    await createUserProfile(result.user);
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
    // Create user profile in Firestore
    await createUserProfile(userCredential.user);
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
    // Email/Password errors
    'auth/email-already-in-use': 'This email address is already registered. Please sign in instead or use a different email.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters long.',
    'auth/user-not-found': 'No account found with this email address. Please check your email or create a new account.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.',
    'auth/invalid-login-credentials': 'Invalid email or password. Please check your credentials and try again.',
    
    // Account status errors
    'auth/user-disabled': 'This account has been disabled. Please contact support for assistance.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email but different sign-in method.',
    
    // Rate limiting and security
    'auth/too-many-requests': 'Too many failed login attempts. Please wait a few minutes before trying again.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
    
    // Network and connection errors
    'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
    'auth/timeout': 'Request timed out. Please try again.',
    
    // Google Sign-in specific
    'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
    'auth/popup-blocked': 'Pop-up blocked by browser. Please allow pop-ups and try again.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
    
    // Configuration errors
    'auth/unauthorized-domain': 'This domain is not authorized for authentication.',
    'auth/app-not-authorized': 'App not authorized to use Firebase Authentication.',
    
    // Token errors
    'auth/expired-action-code': 'The action code has expired. Please request a new one.',
    'auth/invalid-action-code': 'The action code is invalid. Please check and try again.',
    
    // Missing email
    'auth/missing-email': 'Please enter your email address.',
    'auth/missing-password': 'Please enter your password.',
    
    // Internal errors
    'auth/internal-error': 'An internal error occurred. Please try again later.'
  };
  
  // Log the error for debugging with timestamp
  const timestamp = new Date().toISOString();
  console.group(`🔥 Firebase Auth Error - ${timestamp}`);
  console.error('Error Code:', error.code);
  console.error('Error Message:', error.message);
  console.error('Full Error:', error);
  if (error.stack) {
    console.error('Stack Trace:', error.stack);
  }
  console.groupEnd();
  
  const userMessage = errorMap[error.code];
  if (userMessage) {
    return userMessage;
  }
  
  // If we don't have a specific message, provide the error code for debugging
  return `Authentication failed (${error.code}). Please try again or contact support if the problem persists.`;
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// User profile type definition
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  createdAt: Date;
}