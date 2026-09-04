const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();


exports.depositMoney = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("يجب تسجيل الدخول أولًا.");
  }

  const amount = Number(request.data?.amount);

  if (!Number.isFinite(amount) || amount < 0.01) {
    throw new Error("مبلغ الإيداع غير صالح.");
  }

  if (amount > 1000000) {
    throw new Error("الحد الأقصى للإيداع هو 1,000,000.");
  }

  const db = getFirestore();
  const userRef = db.collection("users").doc(request.auth.uid);

  await db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);

    if (!userSnap.exists) {
      throw new Error("الحساب غير موجود.");
    }

    const data = userSnap.data();
    const currentBalance = Number(data.balance || 0);
    const newBalance =
            Math.round((currentBalance + amount) * 100) / 100;

    transaction.update(userRef, {
      balance: newBalance,
    });

    const transactionRef =
            db.collection("transactions").doc();

    const operationNumber =
            Date.now().toString() +
            Math.floor(Math.random() * 1000)
                .toString()
                .padStart(3, "0");

    transaction.set(transactionRef, {
      operationNumber: operationNumber,
      senderUid: null,
      receiverUid: request.auth.uid,
      senderAccountNumber: null,
      receiverAccountNumber: data.accountNumber || null,
      amount: amount,
      currency: data.currency || "USD",
      note: "إيداع",
      status: "completed",
      type: "deposit",
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true,
    message: "تم الإيداع بنجاح.",
  };
});


exports.transferMoney = onCall(async (request) => {
  // يجب أن يكون المستخدم مسجلاً للدخول
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "يجب تسجيل الدخول أولاً.",
    );
  }

  const senderUid = request.auth.uid;

  const receiverAccountNumber =
    typeof request.data?.receiverAccountNumber === "string" ?
      request.data.receiverAccountNumber.trim() :
      "";

  const amount = Number(request.data?.amount);
  const note =
    typeof request.data?.note === "string" ?
      request.data.note.trim().slice(0, 100) :
      "";

  if (!receiverAccountNumber) {
    throw new HttpsError(
        "invalid-argument",
        "رقم حساب المستلم مطلوب.",
    );
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError(
        "invalid-argument",
        "المبلغ غير صحيح.",
    );
  }

  // نستخدم رقمين عشريين كحد أقصى
  if (Math.round(amount * 100) !== amount * 100) {
    throw new HttpsError(
        "invalid-argument",
        "المبلغ يجب ألا يحتوي على أكثر من منزلتين عشريتين.",
    );
  }

  // حد تجريبي أقصى للتحويل
  if (amount > 1000000) {
    throw new HttpsError(
        "invalid-argument",
        "المبلغ يتجاوز الحد المسموح به.",
    );
  }

  // البحث عن حساب المستلم
  const receiverQuery = await db
      .collection("users")
      .where("accountNumber", "==", receiverAccountNumber)
      .limit(1)
      .get();

  if (receiverQuery.empty) {
    throw new HttpsError(
        "not-found",
        "حساب المستلم غير موجود.",
    );
  }

  const receiverDoc = receiverQuery.docs[0];
  const receiverUid = receiverDoc.id;

  // منع التحويل إلى نفس الحساب
  if (receiverUid === senderUid) {
    throw new HttpsError(
        "failed-precondition",
        "لا يمكنك التحويل إلى حسابك نفسه.",
    );
  }

  const senderRef = db.collection("users").doc(senderUid);
  const receiverRef = db.collection("users").doc(receiverUid);
  const transactionRef = db.collection("transactions").doc();

  await db.runTransaction(async (transaction) => {
    const senderSnap = await transaction.get(senderRef);
    const receiverSnap = await transaction.get(receiverRef);

    if (!senderSnap.exists) {
      throw new HttpsError(
          "not-found",
          "حساب المرسل غير موجود.",
      );
    }

    if (!receiverSnap.exists) {
      throw new HttpsError(
          "not-found",
          "حساب المستلم غير موجود.",
      );
    }

    const senderData = senderSnap.data();
    const receiverData = receiverSnap.data();

    const senderBalance = Number(senderData.balance);
    const receiverBalance = Number(receiverData.balance);

    if (
      !Number.isFinite(senderBalance) ||
      !Number.isFinite(receiverBalance)
    ) {
      throw new HttpsError(
          "failed-precondition",
          "بيانات الرصيد غير صالحة.",
      );
    }

    if (senderBalance < amount) {
      throw new HttpsError(
          "failed-precondition",
          "الرصيد غير كافٍ.",
      );
    }

    // التأكد من توافق العملة
    if (
      senderData.currency &&
      receiverData.currency &&
      senderData.currency !== receiverData.currency
    ) {
      throw new HttpsError(
          "failed-precondition",
          "عملة الحسابين مختلفة.",
      );
    }

    const newSenderBalance =
      Math.round((senderBalance - amount) * 100) / 100;

    const newReceiverBalance =
      Math.round((receiverBalance + amount) * 100) / 100;

    // الخصم من المرسل
    transaction.update(senderRef, {
      balance: newSenderBalance,
    });

    // الإضافة للمستلم
    transaction.update(receiverRef, {
      balance: newReceiverBalance,
    });

    // تسجيل العملية
    const operationNumber =
      Date.now().toString() +
      Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0");

    transaction.set(transactionRef, {
      operationNumber: operationNumber,
      senderUid: senderUid,
      receiverUid: receiverUid,

      senderAccountNumber:
        senderData.accountNumber || null,

      receiverAccountNumber:
        receiverData.accountNumber || receiverAccountNumber,

      amount: amount,

      currency:
        senderData.currency ||
        receiverData.currency ||
        null,

      note: note,

      status: "completed",

      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true,
    transactionId: transactionRef.id,
    message: "تم التحويل بنجاح.",
  };
});

exports.withdrawMoney = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("يجب تسجيل الدخول أولًا.");
  }

  const amount = Number(request.data?.amount);

  if (!Number.isFinite(amount) || amount < 0.01) {
    throw new Error("مبلغ السحب غير صالح.");
  }

  if (amount > 1000000) {
    throw new Error("الحد الأقصى للسحب هو 1,000,000.");
  }

  const userRef = db.collection("users").doc(request.auth.uid);

  await db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);

    if (!userSnap.exists) {
      throw new Error("الحساب غير موجود.");
    }

    const data = userSnap.data();
    const currentBalance = Number(data.balance || 0);

    if (amount > currentBalance) {
      throw new Error("الرصيد غير كافٍ.");
    }

    const newBalance =
            Math.round((currentBalance - amount) * 100) / 100;

    transaction.update(userRef, {
      balance: newBalance,
    });

    const transactionRef =
            db.collection("transactions").doc();

    const operationNumber =
            Date.now().toString() +
            Math.floor(Math.random() * 1000)
                .toString()
                .padStart(3, "0");

    transaction.set(transactionRef, {
      operationNumber: operationNumber,
      senderUid: request.auth.uid,
      receiverUid: null,
      senderAccountNumber: data.accountNumber || null,
      receiverAccountNumber: null,
      amount: amount,
      currency: data.currency || "USD",
      note: "سحب",
      status: "completed",
      type: "withdraw",
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true,
    message: "تم السحب بنجاح.",
  };
});

exports.createShamCashDepositRequest = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "يجب تسجيل الدخول أولًا.",
    );
  }

  const amount = Number(request.data?.amount);
  const proofImage = String(request.data?.proofImage || "");

  if (!Number.isFinite(amount) || amount < 0.01) {
    throw new HttpsError(
        "invalid-argument",
        "مبلغ الإيداع غير صالح.",
    );
  }

  if (amount > 1000000) {
    throw new HttpsError(
        "invalid-argument",
        "الحد الأقصى للإيداع هو 1,000,000.",
    );
  }

  if (!proofImage) {
    throw new HttpsError(
        "invalid-argument",
        "يجب إرفاق صورة إشعار التحويل.",
    );
  }

  const userRef =
        db.collection("users").doc(request.auth.uid);

  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new HttpsError(
        "not-found",
        "الحساب غير موجود.",
    );
  }

  const userData = userSnap.data();

  const requestRef =
        db.collection("shamCashDepositRequests").doc();

  const operationNumber =
        Date.now().toString() +
        Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0");

  await requestRef.set({
    operationNumber: operationNumber,
    uid: request.auth.uid,
    accountNumber: userData.accountNumber || null,
    amount: amount,
    currency: userData.currency || "USD",
    proofImage: proofImage,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    requestId: requestRef.id,
    operationNumber: operationNumber,
    message: "تم إرسال طلب الإيداع للمراجعة.",
  };
});


exports.approveShamCashDeposit = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "يجب تسجيل الدخول أولًا.",
    );
  }

  if (request.auth.token.admin !== true) {
    throw new HttpsError(
        "permission-denied",
        "ليس لديك صلاحية المدير.",
    );
  }

  const requestId =
        String(request.data?.requestId || "").trim();

  if (!requestId) {
    throw new HttpsError(
        "invalid-argument",
        "رقم طلب الإيداع غير صالح.",
    );
  }

  const requestRef =
        db.collection("shamCashDepositRequests").doc(requestId);

  await db.runTransaction(async (transaction) => {
    const requestSnap =
            await transaction.get(requestRef);

    if (!requestSnap.exists) {
      throw new HttpsError(
          "not-found",
          "طلب الإيداع غير موجود.",
      );
    }

    const depositRequest = requestSnap.data();

    if (depositRequest.status !== "pending") {
      throw new HttpsError(
          "failed-precondition",
          "هذا الطلب تمت معالجته مسبقًا.",
      );
    }

    const userUid = depositRequest.uid;

    if (!userUid) {
      throw new HttpsError(
          "failed-precondition",
          "بيانات صاحب الطلب غير صالحة.",
      );
    }

    const userRef =
            db.collection("users").doc(userUid);

    const userSnap =
            await transaction.get(userRef);

    if (!userSnap.exists) {
      throw new HttpsError(
          "not-found",
          "حساب صاحب الطلب غير موجود.",
      );
    }

    const userData = userSnap.data();

    const amount =
            Number(depositRequest.amount);

    if (!Number.isFinite(amount) || amount < 0.01) {
      throw new HttpsError(
          "failed-precondition",
          "مبلغ الطلب غير صالح.",
      );
    }

    const currentBalance =
            Number(userData.balance || 0);

    const newBalance =
            Math.round(
                (currentBalance + amount) * 100,
            ) / 100;

    transaction.update(userRef, {
      balance: newBalance,
    });

    const transactionRef =
            db.collection("transactions").doc();

    transaction.set(transactionRef, {
      operationNumber:
                depositRequest.operationNumber || null,

      senderUid: null,

      receiverUid: userUid,

      senderAccountNumber: null,

      receiverAccountNumber:
                userData.accountNumber || null,

      amount: amount,

      currency:
                depositRequest.currency ||
                userData.currency ||
                "USD",

      note: "إيداع شام كاش",

      status: "completed",

      type: "deposit",

      createdAt:
                FieldValue.serverTimestamp(),
    });

    transaction.update(requestRef, {
      status: "approved",

      approvedBy:
                request.auth.uid,

      approvedAt:
                FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true,
    message: "تمت الموافقة على إيداع شام كاش وإضافة الرصيد.",
  };
});


exports.rejectShamCashDeposit = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "يجب تسجيل الدخول أولًا.",
    );
  }

  if (request.auth.token.admin !== true) {
    throw new HttpsError(
        "permission-denied",
        "ليس لديك صلاحية المدير.",
    );
  }

  const requestId =
        String(request.data?.requestId || "").trim();

  if (!requestId) {
    throw new HttpsError(
        "invalid-argument",
        "رقم طلب الإيداع غير صالح.",
    );
  }

  const requestRef =
        db.collection("shamCashDepositRequests").doc(requestId);

  const requestSnap =
        await requestRef.get();

  if (!requestSnap.exists) {
    throw new HttpsError(
        "not-found",
        "طلب الإيداع غير موجود.",
    );
  }

  const depositRequest = requestSnap.data();

  if (depositRequest.status !== "pending") {
    throw new HttpsError(
        "failed-precondition",
        "هذا الطلب تمت معالجته مسبقًا.",
    );
  }

  await requestRef.update({
    status: "rejected",
    rejectedBy: request.auth.uid,
    rejectedAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    message: "تم رفض طلب إيداع شام كاش.",
  };
});


exports.listShamCashDepositRequests = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "يجب تسجيل الدخول أولًا.",
    );
  }

  if (request.auth.token.admin !== true) {
    throw new HttpsError(
        "permission-denied",
        "ليس لديك صلاحية المدير.",
    );
  }

  const snapshot = await db
      .collection("shamCashDepositRequests")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

  const requests = snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      operationNumber: data.operationNumber || null,
      uid: data.uid || null,
      accountNumber: data.accountNumber || null,
      amount: Number(data.amount || 0),
      currency: data.currency || "USD",
      proofImage: data.proofImage || "",
      status: data.status || "pending",
      createdAt: data.createdAt?.toMillis ?
                data.createdAt.toMillis() :
                null,
    };
  });

  return {
    success: true,
    requests,
  };
});
