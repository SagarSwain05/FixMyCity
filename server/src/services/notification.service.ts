import { Types } from "mongoose";
import { Notification, NotificationType } from "../models/Notification";
import User from "../models/User";
import { emitToUser } from "./realtime";
import { renderEmail, sendEmail } from "./email.service";
import { env } from "../config/env";

interface NotifyInput {
  userId: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  issueId?: Types.ObjectId | string | null;
  email?: boolean; // also send an email if the user opted in
}

export async function notify(input: NotifyInput) {
  const n = await Notification.create({
    user: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    issue: input.issueId || null,
  });
  emitToUser(String(input.userId), "notification", n.toJSON());

  if (input.email) {
    const user = await User.findById(input.userId).select("email fullName emailNotifications");
    // Demo accounts use an unroutable domain; sending to them would hurt sender reputation.
    if (user?.email && user.emailNotifications && !user.email.endsWith("@demo.fixmycity.in")) {
      const link = input.issueId ? `${env.clientUrl}/issues/${input.issueId}` : env.clientUrl;
      // fire-and-forget so API latency is not tied to the email provider
      void sendEmail(
        { email: user.email, name: user.fullName },
        `FixMyCity: ${input.title}`,
        renderEmail(input.title, input.message, link)
      );
    }
  }
  return n;
}
