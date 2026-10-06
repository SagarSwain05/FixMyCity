import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { env } from "../config/env";
import { IAttachment } from "../models/Issue";

// cloudinary reads CLOUDINARY_URL from the environment by itself.
if (env.cloudinaryUrl) cloudinary.config({ secure: true });

export function storageProvider(): "cloudinary" | "local" {
  return env.cloudinaryUrl ? "cloudinary" : "local";
}

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) return cb(null, true);
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only image and video uploads are allowed"));
  },
});

function uploadBufferToCloudinary(file: Express.Multer.File): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "fixmycity/issues", resource_type: "auto" },
      (err, result) => (err || !result ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  });
}

async function saveLocally(file: Express.Multer.File): Promise<string> {
  const dir = path.resolve(env.uploadDir);
  await fs.promises.mkdir(dir, { recursive: true });
  const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "") || "";
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  await fs.promises.writeFile(path.join(dir, name), file.buffer);
  return `${env.publicUrl}/uploads/${name}`;
}

export async function storeFiles(files: Express.Multer.File[]): Promise<IAttachment[]> {
  const out: IAttachment[] = [];
  for (const f of files) {
    if (storageProvider() === "cloudinary") {
      const r = await uploadBufferToCloudinary(f);
      out.push({ filename: f.originalname, url: r.secure_url, mimetype: f.mimetype, size: f.size, publicId: r.public_id });
    } else {
      const url = await saveLocally(f);
      out.push({ filename: f.originalname, url, mimetype: f.mimetype, size: f.size });
    }
  }
  return out;
}

export async function deleteStoredFiles(attachments: IAttachment[]) {
  for (const a of attachments) {
    try {
      if (a.publicId && env.cloudinaryUrl) {
        const resourceType = a.mimetype.startsWith("video/") ? "video" : "image";
        await cloudinary.uploader.destroy(a.publicId, { invalidate: true, resource_type: resourceType });
      } else if (a.url.includes("/uploads/")) {
        const name = path.basename(a.url);
        await fs.promises.unlink(path.join(path.resolve(env.uploadDir), name)).catch(() => undefined);
      }
    } catch (e) {
      console.error("Failed to delete stored file", a.url, (e as Error).message);
    }
  }
}
