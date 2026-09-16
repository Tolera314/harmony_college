import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

/**
 * Returns true if Cloudinary credentials are fully configured.
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId:  string;
}

/**
 * Upload a buffer to Cloudinary.
 * Uses resource_type: 'auto' to support images, PDFs, and other file types.
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string = process.env.CLOUDINARY_FOLDER || 'harmony_college/profiles',
  resourceType: 'image' | 'raw' | 'auto' = 'auto',
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename:  false,
        unique_filename: true,
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          const msg = error?.message ?? 'Cloudinary upload failed';
          console.error('[Cloudinary] Upload error:', error);
          return reject(new Error(msg));
        }
        resolve({
          secureUrl: result.secure_url,
          publicId:  result.public_id,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
}

export default cloudinary;
