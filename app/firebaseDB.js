const app = require('firebase-admin');
const {applicationDefault} = require("firebase-admin/app");

const firebaseConfig = {
  credential: applicationDefault(),
  apiKey: "AIzaSyC1Qhzu5BG2ZWIEy0_XtN-b-1j057LUfC8",
  authDomain: "leadtechnique2022.firebaseapp.com",
  databaseURL: "https://leadtechnique2022-default-rtdb.firebaseio.com",
  projectId: "leadtechnique2022",
  storageBucket: "leadtechnique2022.appspot.com",
  messagingSenderId: "555327172157",
  appId: "1:555327172157:web:143d2e9ebe0117b8da0454"
};

app.initializeApp(firebaseConfig);

module.exports = app.database();