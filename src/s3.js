import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const UPLOAD_EXPIRES_IN = 3600;

export const s3Helper = {
  generateUploadUrl: async (filename, contentType) => {
    try {
      const fullkey = `uploads/user-uploads/${filename}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fullkey,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: UPLOAD_EXPIRES_IN,
      });

      return {
        uploadUrl,
        key: fullkey,
        expiresIn: UPLOAD_EXPIRES_IN,
      };
    } catch (error) {
      console.error("Error generating upload URL:", error);
      throw new Error("Failed to generate upload URL");
    }
  },
  generateFileKey: (userId, filename) => {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

    const hash = crypto
      .createHash("sha1")
      .update(`${userId}-${sanitizedFilename}-${timestamp}`)
      .digest("hex");

    const extension = sanitizedFilename.split(".").pop();
    return `${userId}/${hash}.${extension}`;
  },
};
