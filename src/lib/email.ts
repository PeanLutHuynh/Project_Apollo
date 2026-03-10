import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_REGION ?? "ap-southeast-1",
});

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<EmailResult> {
  const from = process.env.SES_FROM_EMAIL;
  if (!from) {
    return { success: false, error: "SES_FROM_EMAIL not configured" };
  }

  try {
    const command = new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: body, Charset: "UTF-8" },
          Html: {
            Data: `<div style="font-family:sans-serif;line-height:1.6;">${body.replace(/\n/g, "<br>")}</div>`,
            Charset: "UTF-8",
          },
        },
      },
    });

    const response = await sesClient.send(command);
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown SES error";
    console.error("[SES] Email send failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
