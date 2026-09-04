const http = require("http");

function post(port, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);

    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      let result = "";
      res.on("data", chunk => result += chunk);
      res.on("end", () => resolve({
        status: res.statusCode,
        data: result
      }));
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const login = await post(
    9099,
    "/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key",
    {
      email: "sender@test.local",
      password: "Test123456",
      returnSecureToken: true
    }
  );

  const auth = JSON.parse(login.data);

  if (!auth.idToken) {
    throw new Error("لم يتم الحصول على idToken: " + login.data);
  }

  const transfer = await post(
    5001,
    "/ahmad-662ee/us-central1/transferMoney",
    {
      data: {
        receiverAccountNumber: "100002",
        amount: 250,
        note: "اختبار تحويل حقيقي"
      }
    },
    {
      Authorization: `Bearer ${auth.idToken}`
    }
  );

  console.log("نتيجة التحويل:");
  console.log("HTTP:", transfer.status);
  console.log(transfer.data);
}

main().catch(err => {
  console.error("خطأ:", err.message);
  process.exit(1);
});
