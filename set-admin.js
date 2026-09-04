const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

initializeApp({
    projectId: "ahmad-662ee"
});

const auth = getAuth();

auth.setCustomUserClaims(
    "gZHLkjbV2pRrT2srzLnacAioMM27",
    { admin: true }
)
.then(() => {
    console.log("✅ تم إعطاء صلاحية المدير بنجاح.");
})
.catch((error) => {
    console.error("❌ خطأ:", error);
});
