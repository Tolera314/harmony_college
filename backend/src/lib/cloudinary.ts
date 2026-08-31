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
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string = process.env.CLOUDINARY_FOLDER || 'harmony_college/profiles'
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload failed.'));
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
