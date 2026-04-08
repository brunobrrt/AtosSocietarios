// ===== CONFIGURAÇÃO DO FIREBASE =====
// Projeto: atossocietarios-cc48d

window.firebaseConfig = {
    apiKey: "AIzaSyDv390Q31ehf9SBdlFQBrmvsByzi2BxOYY",
    authDomain: "atossocietarios-cc48d.firebaseapp.com",
    projectId: "atossocietarios-cc48d",
    storageBucket: "atossocietarios-cc48d.firebasestorage.app",
    messagingSenderId: "1063285830045",
    appId: "1:1063285830045:web:76f4d81224bed786d3ff74",
    measurementId: "G-RT2ZZ265ZY"
};

// Inicializar Firebase (apenas uma vez)
if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(window.firebaseConfig);
    console.log('✅ Firebase inicializado');
} else if (typeof firebase === 'undefined') {
    console.error('❌ Firebase SDK não carregado');
}
