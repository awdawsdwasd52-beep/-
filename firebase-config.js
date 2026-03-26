const firebaseConfig = {
    apiKey: "AIzaSyB9XzL1XzL1XzL1XzL1XzL1XzL1XzL1",
    authDomain: "ipsteal-4bf1c.firebaseapp.com",
    databaseURL: "https://ipsteal-4bf1c-default-rtdb.firebaseio.com/",
    projectId: "ipsteal-4bf1c",
    storageBucket: "ipsteal-4bf1c.firebasestorage.app",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:xxxxxxxxxxxx"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const usersRef = database.ref('users');
const messagesRef = database.ref('channel_messages');
const bansRef = database.ref('bans');
const mutesRef = database.ref('mutes');
const channelsRef = database.ref('channels');
const rolesRef = database.ref('roles');
const userRolesRef = database.ref('user_roles');
