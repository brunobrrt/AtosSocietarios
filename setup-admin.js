// ===== SETUP-ADMIN =====
// Script para configurar o primeiro usuário admin (e criar usuários posteriormente)
// Executar com: node setup-admin.js

const admin = require('firebase-admin');
const readline = require('readline');

// Inicializar Firebase Admin SDK
let serviceAccount;

try {
    serviceAccount = require('./service-account.json');
} catch (e) {
    console.error('❌ Erro: Arquivo service-account.json não encontrado!');
    console.log('   Baixe as credenciais em: Firebase Console → Config. Projeto → Contas de serviço → "Gerar nova chave privada"');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// ===== FUNÇÃO: Criar/Atualizar usuário com role =====
async function setUserRole(email, role, senha) {
    try {
        // 1. Buscar usuário pelo email
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
            console.log(`✅ Usuário encontrado: ${email} (UID: ${userRecord.uid})`);
            if (senha) {
                await auth.updateUser(userRecord.uid, { password: senha });
                console.log(`✅ Senha atualizada`);
            }
        } catch (err) {
            // Se não existe, criar
            console.log(`➕ Criando novo usuário: ${email}`);
            userRecord = await auth.createUser({
                email: email,
                password: senha,
                emailVerified: true
            });
            console.log(`✅ Usuário criado com UID: ${userRecord.uid}`);
        }

        // 2. Set custom claim (role)
        await auth.setCustomUserClaims(userRecord.uid, { role: role });
        console.log(`✅ Role definida: ${role}`);

        // 3. Criar/atualizar documento na coleção users
        const userDoc = db.collection('users').doc(userRecord.uid);
        await userDoc.set({
            email: email,
            role: role,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`✅ Documento no Firestore atualizado`);

        return { success: true, uid: userRecord.uid, email, role };
    } catch (error) {
        console.error('❌ Erro:', error.message);
        return { success: false, error: error.message };
    }
}

// ===== MENU INTERATIVO =====
function perguntar(questao) {
    return new Promise(resolve => rl.question(questao, resolve));
}

async function main() {
    console.log('\n========================================');
    console.log('  🔐 CONFIGURAÇÃO DE USUÁRIOS — ATOS SOCIETÁRIOS');
    console.log('========================================\n');

    const email = await perguntar('📧 Email do usuário: ');
    const roleInput = await perguntar('👤 Role (admin / viewer): ').then(r => r.toLowerCase().trim());
    const role = roleInput === 'admin' ? 'admin' : 'viewer';

    let senha = '';
    while (senha.length < 8) {
        senha = await perguntar('🔑 Senha (mín. 8 caracteres): ');
        if (senha.length < 8) console.log('   ⚠️  Senha muito curta, tente novamente.');
    }

    console.log(`\n⚙️  Configurando ${email} como ${role}...\n`);

    const result = await setUserRole(email, role, senha);

    if (result.success) {
        console.log('\n✅ SUCESSO!');
        console.log(`   Email: ${result.email}`);
        console.log(`   Role: ${result.role}`);
        console.log(`   UID: ${result.uid}`);
        console.log('\n📝 Próximos passos:');
        console.log('   1. Acesse o sistema com o email e senha informados');
        console.log('   2. Para criar mais usuários, execute este script novamente\n');
    } else {
        console.error('\n❌ FALHA:', result.error);
    }

    rl.close();
}

main().catch(err => {
    console.error('Erro inesperado:', err);
    rl.close();
});
