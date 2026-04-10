import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  Firestore 
} from 'firebase/firestore';

// Default interface for Firebase Config
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Default to the provided Firebase configuration
const DEFAULT_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyD_qorE7Pz3D8YuriAADCzf5cMyoJeSA-k",
  authDomain: "biometric-97485.firebaseapp.com",
  projectId: "biometric-97485",
  storageBucket: "biometric-97485.firebasestorage.app",
  messagingSenderId: "199670746572",
  appId: "1:199670746572:web:e055a45f71980d66682169"
};

// Get stored config from localStorage, or use default provided credentials
export const getStoredConfig = (): FirebaseConfig | null => {
  const envConfig: Partial<FirebaseConfig> = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (envConfig.apiKey && envConfig.projectId && envConfig.appId) {
    return envConfig as FirebaseConfig;
  }

  const stored = localStorage.getItem('firebase_config');
  if (!stored) {
    return DEFAULT_CONFIG;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return DEFAULT_CONFIG;
  }
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// Initialize Firebase App
export const initFirebase = (config: FirebaseConfig): boolean => {
  try {
    if (!config.apiKey || !config.projectId) return false;
    
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    localStorage.setItem('firebase_config', JSON.stringify(config));
    return true;
  } catch (error) {
    console.error("Firebase initialization error:", error);
    return false;
  }
};

// Check if Firebase is successfully configured and initialized
export const isFirebaseConfigured = (): boolean => {
  return app !== null && db !== null;
};

// --- FIRESTORE HELPER FUNCTIONS ---

// 1. Sync Students to Firestore
export const syncStudentToFirebase = async (student: any) => {
  if (!db) return;
  try {
    const studentRef = doc(collection(db, 'students'), student.id);
    await setDoc(studentRef, student);
  } catch (error) {
    console.error("Error syncing student:", error);
  }
};

// 2. Fetch all Students from Firestore
export const fetchStudentsFromFirebase = async (): Promise<any[]> => {
  if (!db) return [];
  try {
    const querySnapshot = await getDocs(collection(db, 'students'));
    const students: any[] = [];
    querySnapshot.forEach((doc) => {
      students.push(doc.data());
    });
    return students;
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
};

// 3. Sync Attendance to Firestore
export const syncAttendanceToFirebase = async (record: any) => {
  if (!db) return;
  try {
    const attendanceRef = doc(collection(db, 'attendance'), record.id);
    await setDoc(attendanceRef, record);
  } catch (error) {
    console.error("Error syncing attendance:", error);
  }
};

// 4. Fetch all Attendance from Firestore
export const fetchAttendanceFromFirebase = async (): Promise<any[]> => {
  if (!db) return [];
  try {
    const querySnapshot = await getDocs(collection(db, 'attendance'));
    const attendance: any[] = [];
    querySnapshot.forEach((doc) => {
      attendance.push(doc.data());
    });
    return attendance;
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return [];
  }
};

// 5. Delete Student from Firestore
export const deleteStudentFromFirebase = async (studentId: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    console.error("Error deleting student:", error);
  }
};
