import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({
  region: process.env.AWS_REGION ?? "ap-southeast-1",
});

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<SMSResult> {
  try {
    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
      },
    });

    const response = await snsClient.send(command);
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown SNS error";
    console.error("[SNS] SMS send failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
