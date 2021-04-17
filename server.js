//////////////////////////////////////////////////////////////////////
// init project
const express = require("express");
const fs = require("fs");

//////////////////////////////////////////////////////////////////////
// Firebase App (the core Firebase SDK) is always required and
// must be listed before other Firebase SDKs
var firebase = require("firebase/app");
require("firebase/database");
const firebaseConfig = {
  apiKey: "AIzaSyD-s0iDFoWg81USosNk7YR4B-0NKQJnc9g",
  authDomain: "zone-vue.firebaseapp.com",
  databaseURL: "https://zone-vue.firebaseio.com",
  projectId: "zone-vue",
  storageBucket: "zone-vue.appspot.com",
  messagingSenderId: "175918210400",
  appId: "1:175918210400:web:bd16580d7c9e60e6b25205"
};
firebase.initializeApp(firebaseConfig);

//////////////////////////////////////////////////////////////////////
const app = express();

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});