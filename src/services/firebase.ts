import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAloEjmYgge4qMEcC5nSEpCKKujXNKCUn4",
  authDomain: "dashboa-7e20b.firebaseapp.com",
  projectId: "dashboa-7e20b",
  storageBucket: "dashboa-7e20b.firebasestorage.app",
  messagingSenderId: "388853115750",
  appId: "1:388853115750:web:864ca2f6c38bff244df6a7",
  measurementId: "G-T18BZCW1TY"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, 'dang-ky-phong');
