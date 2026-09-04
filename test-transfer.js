const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");
const {initializeApp} = require("firebase-admin/app");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

initializeApp({projectId: "ahmad-662ee"});

async function main() {
  const db = getFirestore();
  const sender = await db.collection("users").doc("test-sender").get();
  const receiver = await db.collection("users").doc("test-receiver").get();

  console.log("قبل التحويل:");
  console.log("المرسل:", sender.data().balance);
  console.log("المستلم:", receiver.data().balance);

  console.log("\nحسابات الاختبار موجودة وجاهزة.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
