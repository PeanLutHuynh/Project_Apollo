import https from "https";

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<SMSResult> {
  const accessToken = process.env.SPEEDSMS_ACCESS_TOKEN;

  if (!accessToken) {
    return { success: false, error: "SpeedSMS access token not configured" };
  }

  const auth =
    "Basic " + Buffer.from(accessToken + ":x").toString("base64");

  // SpeedSMS expects numbers without leading + (e.g. "84935205238")
  const normalizedPhone = phoneNumber.startsWith("+")
    ? phoneNumber.slice(1)
    : phoneNumber;

  const payload = JSON.stringify({
    to: [normalizedPhone],
    content: message,
    sms_type: 5,
    sender: process.env.SPEEDSMS_DEVICE_ID ?? "",
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.speedsms.vn",
        port: 443,
        path: "/index.php/sms/send",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(body);
            if (json.status === "success") {
              resolve({ success: true, messageId: json.data?.tranId?.toString() });
            } else {
              const errMsg = json.message ?? JSON.stringify(json);
              console.error("[SpeedSMS] send failed:", errMsg);
              resolve({ success: false, error: errMsg });
            }
          } catch {
            resolve({ success: false, error: "Invalid response from SpeedSMS" });
          }
        });
      }
    );

    req.on("error", (e) => {
      console.error("[SpeedSMS] request error:", e.message);
      resolve({ success: false, error: e.message });
    });

    req.write(payload);
    req.end();
  });
}

