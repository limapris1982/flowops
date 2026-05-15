import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDYHIo7T22XIw5BozD0WW3YvPUzxN5eT6E",
  authDomain: "manutecos-b92d9.firebaseapp.com",
  projectId: "manutecos-b92d9",
  storageBucket: "manutecos-b92d9.firebasestorage.app",
  messagingSenderId: "1052663671017",
  appId: "1:1052663671017:web:6731da02033fccda33e878",
  measurementId: "G-SSJ2HQBC3X"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;