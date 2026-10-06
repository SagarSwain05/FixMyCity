import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import { chatReply } from "../services/chat.service";

const bodySchema = z.object({ message: z.string().trim().min(1).max(500) });

export async function chat(req: AuthenticatedRequest, res: Response) {
  const { message } = bodySchema.parse(req.body);
  res.json(await chatReply(message, req.user));
}
