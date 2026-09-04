const http = require("http");

const body = JSON.stringify({
  email: "sender@test.local",
  password: "Test123456",
  returnSecureToken: true
});

const options = {
  hostname: "127.0.0.1",
  port: 9099,
  path: "/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => data += chunk);

  res.on("end", () => {
    console.log("HTTP:", res.statusCode);
    console.log(data);
  });
});

req.on("error", console.error);
req.write(body);
req.end();
