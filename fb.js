// Firebase 초기화. 다른 파일은 여기서 가져다 쓴다.
// Firestore 는 메모리 캐시만 쓴다 (flashcard 와 같은 github.io 도메인이라 브라우저 저장소를 섞지 않으려고).
const B = "https://www.gstatic.com/firebasejs/11.0.2/";
const [appM, A, FS] = await Promise.all([
  import(B + "firebase-app.js"), import(B + "firebase-auth.js"),
  import(B + "firebase-firestore.js")
]);
export { A, FS };
export const OWNER = window.OWNER_UID;
export const app = appM.initializeApp(window.FIREBASE_CONFIG);
export const auth = A.getAuth(app);
export const db = FS.getFirestore(app);
