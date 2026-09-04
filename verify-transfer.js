const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";

initializeApp({projectId: "ahmad-662ee"});

async function main() {
  const db = getFirestore();

  const sender = await db.collection("users").doc("test-sender").get();
  const receiver = await db.collection("users").doc("test-receiver").get();

  const transactions = await db
    .collection("transactions")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  console.log("=== بعد التحويل ===");
  console.log("رصيد المرسل:", sender.data().balance);
  console.log("رصيد المستلم:", receiver.data().balance);

  if (!transactions.empty) {
    console.log("\n=== آخر عملية ===");
    console.log(transactions.docs[0].data());
  } else {
    console.log("\nلم يتم العثور على عملية.");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
