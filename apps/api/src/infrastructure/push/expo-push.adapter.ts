import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PushPort } from "./push.port.js";
import type { TimetableChangePushPayload } from "../../notifications/push.types.js";

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  data: Record<string, string>;
};

@Injectable()
export class ExpoPushAdapter implements PushPort {
  private readonly logger = new Logger(ExpoPushAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async sendTimetableChangeNotification(
    payload: TimetableChangePushPayload,
  ): Promise<void> {
    const tokens = payload.tokens.filter((token) =>
      /^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(token),
    );
    if (tokens.length === 0) {
      return;
    }

    const endpoint =
      this.configService.get<string>("EXPO_PUSH_ENDPOINT") ??
      "https://exp.host/--/api/v2/push/send";
    const accessToken = this.configService.get<string>(
      "EXPO_PUSH_ACCESS_TOKEN",
    );

    for (const batch of this.chunk(tokens, 100)) {
      const messages: ExpoPushMessage[] = batch.map((token) => ({
        to: token,
        title: payload.title,
        body: payload.body,
        sound: "default",
        data: payload.data,
      }));

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        this.logger.error(
          `Expo push request failed with status ${response.status}: ${text}`,
        );
      }
    }
  }

  private chunk(values: string[], size: number) {
    const batches: string[][] = [];
    for (let index = 0; index < values.length; index += size) {
      batches.push(values.slice(index, index + size));
    }
    return batches;
  }
}
