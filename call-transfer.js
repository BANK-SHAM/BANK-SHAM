const http = require("http");

const body = JSON.stringify({
  data: {
    receiverAccountNumber: "100002",
    amount: 250,
    note: "اختبار تحويل",
  },
});

const options = {
  hostname: "127.0.0.1",
  port: 5001,
  path: "/ahmad-662ee/us-central1/transferMoney",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Authorization": "Bearer owner",
  },
};

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("HTTP:", res.statusCode);
    console.log(data);
  });
});

req.on("error", (err) => {
  console.error(err);
});

req.write(body);
req.end();
