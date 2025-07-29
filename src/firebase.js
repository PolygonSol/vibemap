// Firebase configuration for visitor counter
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, increment } from 'firebase/database';

// Your Firebase config (you can get this from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "vibemap-counter.firebaseapp.com",
  databaseURL: "https://vibemap-counter-default-rtdb.firebaseio.com",
  projectId: "vibemap-counter",
  storageBucket: "vibemap-counter.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Visitor counter functions
export const getVisitorCount = async () => {
  try {
    const countRef = ref(database, 'visitorCount');
    const snapshot = await get(countRef);
    return snapshot.exists() ? snapshot.val() : 0;
  } catch (error) {
    console.error('Error getting visitor count:', error);
    return 0;
  }
};

export const incrementVisitorCount = async () => {
  try {
    const countRef = ref(database, 'visitorCount');
    await set(countRef, increment(1));
    return await getVisitorCount();
  } catch (error) {
    console.error('Error incrementing visitor count:', error);
    return 0;
  }
};

export default database; 