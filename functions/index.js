// Cloud Functions — Usuários e Roles (Atos Societários)
// Region: us-central1

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// ===== MANAGE USER =====
// Ações: create, updateRole, delete, list
exports.manageUser = functions.region('us-central1').https.onCall(async (data, context) => {
    // Auth check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    if (context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem executar esta ação');
    }

    const { action, email, senha, role, uid } = data;

    try {
        switch (action) {
            case 'create':
                if (!email || !senha || !role) {
                    throw new functions.https.HttpsError('invalid-argument', 'Email, senha e role são obrigatórios');
                }
                const newUser = await admin.auth().createUser({ email, password: senha, emailVerified: true });
                await admin.auth().setCustomUserClaims(newUser.uid, { role });
                await db.collection('users').doc(newUser.uid).set({
                    email, role,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                return { success: true, uid: newUser.uid, email, role };

            case 'updateRole':
                if (!uid || !role) throw new functions.https.HttpsError('invalid-argument', 'UID e role obrigatórios');
                if (uid === context.auth.uid) {
                    throw new functions.https.HttpsError('invalid-argument', 'Não pode alterar própria role');
                }
                await admin.auth().setCustomUserClaims(uid, { role });
                await db.collection('users').doc(uid).update({
                    role,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                return { success: true, uid, role };

            case 'delete':
                if (!uid) throw new functions.https.HttpsError('invalid-argument', 'UID obrigatório');
                if (uid === context.auth.uid) {
                    throw new functions.https.HttpsError('invalid-argument', 'Não pode remover a si mesmo');
                }
                await admin.auth().deleteUser(uid);
                await db.collection('users').doc(uid).delete();
                return { success: true, uid };

            case 'list':
                const snapshot = await db.collection('users').get();
                const usuarios = snapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
                }));
                return { success: true, usuarios };

            default:
                throw new functions.https.HttpsError('invalid-argument', 'Ação inválida');
        }
    } catch (error) {
        console.error('manageUser error:', error);
        throw new functions.https.HttpsError('unknown', error.message);
    }
});

// ===== GET CURRENT USER =====
exports.getCurrentUser = functions.region('us-central1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const uid = context.auth.uid;
    const token = context.auth.token;

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : { role: token.role || 'viewer' };

    return {
        uid,
        email: token.email,
        role: userData.role || token.role || 'viewer',
        createdAt: userData.createdAt?.toDate?.()?.toISOString() || null
    };
});
