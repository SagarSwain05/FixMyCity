import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";

export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: "Not Found" });
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
    });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: err.message, code: err.code });
  }
  if (err?.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }
  if (err?.name === "ValidationError") {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ success: false, message: `A record with this ${field} already exists` });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 ? "Internal Server Error" : err.message,
    code: err.code,
  });
}
