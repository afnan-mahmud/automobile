/**
 * Thin wrapper over the BulkSMSBD gateway (https://bulksmsbd.net/api/smsapi),
 * a widely used BD SMS provider. Swapping in real credentials later requires
 * no code change — just set SMS_API_KEY / SMS_SENDER_ID.
 */
export type SendSmsResult = {
  success: boolean;
  providerResponse?: unknown;
  error?: string;
};

const BULKSMSBD_ENDPOINT = "https://bulksmsbd.net/api/smsapi";

export async function sendSms(phone: string, message: string): Promise<SendSmsResult> {
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID;

  if (!apiKey || !senderId) {
    return {
      success: false,
      error: "SMS gateway is not configured (missing SMS_API_KEY/SMS_SENDER_ID)",
    };
  }

  try {
    const url = new URL(BULKSMSBD_ENDPOINT);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("type", "text");
    url.searchParams.set("number", phone);
    url.searchParams.set("senderid", senderId);
    url.searchParams.set("message", message);

    const res = await fetch(url.toString());
    const body: unknown = await res.json().catch(() => null);

    const responseCode =
      body && typeof body === "object" && "response_code" in body
        ? (body as { response_code?: number }).response_code
        : undefined;

    if (!res.ok || responseCode !== 202) {
      const errorMessage =
        body && typeof body === "object" && "error_message" in body
          ? String((body as { error_message?: unknown }).error_message)
          : "SMS provider rejected the request";
      return { success: false, providerResponse: body, error: errorMessage };
    }

    return { success: true, providerResponse: body };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reach SMS gateway",
    };
  }
}
