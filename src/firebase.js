import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCp9YBWxJhzeRCdnkWj7uFJts7eWuy-J0o",
  authDomain: "super55.firebaseapp.com",
  projectId: "super55",
  storageBucket: "super55.appspot.com",
  messagingSenderId: "419421679286",
  appId: "1:419421679286:web:7ee32f7e60a5ed91bb4017",
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
