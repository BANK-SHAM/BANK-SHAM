const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

initializeApp({projectId: "ahmad-662ee"});

async function main() {
  const auth = getAuth();
  const db = getFirestore();

  const users = [
    {
      uid: "test-sender",
      email: "sender@test.local",
      password: "Test123456",
      accountNumber: "100001",
      balance: 1000,
      currency: "USD",
    },
    {
      uid: "test-receiver",
      email: "receiver@test.local",
      password: "Test123456",
      accountNumber: "100002",
      balance: 100,
      currency: "USD",
    },
  ];

  for (const user of users) {
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: user.password,
      });
    } catch (e) {
      if (e.code !== "auth/uid-already-exists") throw e;
    }

    await db.collection("users").doc(user.uid).set({
      accountNumber: user.accountNumber,
      balance: user.balance,
      currency: user.currency,
      email: user.email,
    });
  }

  console.log("تم إنشاء حسابي الاختبار بنجاح.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
