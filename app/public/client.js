import {initializeApp} from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js'
import {getDatabase, onValue, ref} from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-database.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  getAuth,
  setPersistence,
  browserSessionPersistence
} from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyC1Qhzu5BG2ZWIEy0_XtN-b-1j057LUfC8",
  authDomain: "leadtechnique2022.firebaseapp.com",
  databaseURL: "https://leadtechnique2022-default-rtdb.firebaseio.com",
  projectId: "leadtechnique2022",
  storageBucket: "leadtechnique2022.appspot.com",
  messagingSenderId: "555327172157",
  appId: "1:555327172157:web:143d2e9ebe0117b8da0454"
}
const provider = new GoogleAuthProvider();

const app = initializeApp(firebaseConfig);
const auth = getAuth();

setPersistence(auth, browserSessionPersistence).then(() => {
  if (auth.currentUser) {
    isLogged()
  } else {
    googleButton.style.display = 'inline-block'
  }
})
const db = getDatabase();

const googleButton = document.querySelector('#googleLogin')
const zipButton = document.querySelector('#zipButton')
const downloadButton = document.querySelector('#downloadButton')
const tagsInput = document.querySelector('#tags')
downloadButton.style.display = 'none'
zipButton.style.display = 'none'
googleButton.style.display = 'none'

const updateButton = (data) => {
  if (tagsInput.value) {
    const tagsRef = ref(db, 'mem/jobs/' + tagsInput.value)
    onValue(tagsRef, async (snapshot) => {
      downloadButton.style.display = 'none'
      downloadButton.href = '';

      if (snapshot.val()) {
        const res = await fetch('/getZip?filename=' + snapshot.val())
        const link = await res.text()
        if (link) {
          downloadButton.style.display = 'inline-block'
          downloadButton.href = link;
        }
      }
    })
  }
}

const googleLogin = () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
      const user = result.user;
      isLogged()
    }).catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    // The email of the user's account used.
    const email = error.customData.email;
    // The AuthCredential type that was used.
    const credential = GoogleAuthProvider.credentialFromError(error);
  });
}

const isLogged = () => {
  googleButton.remove()
  zipButton.style.display = 'inline-block'
  updateButton()
}

zipButton.addEventListener('click', updateButton)

googleButton.addEventListener('click', googleLogin)