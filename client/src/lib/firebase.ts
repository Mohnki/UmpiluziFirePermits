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

// User profile type definition
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  createdAt: Date;
}