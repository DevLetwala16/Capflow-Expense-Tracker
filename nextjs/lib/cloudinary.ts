import { v2 as cloudinary } from 'cloudinary';

const cloudinaryUrl =
  process.env.CLOUDINARY_URL ||
  'cloudinary://334943833419344:o3852jHh1zePctR_NhcB-eiAFZM@e42rd7k1';

// Configure Cloudinary
if (cloudinaryUrl) {
  const match = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) {
    cloudinary.config({
      cloud_name: match[3],
      api_key: match[1],
      api_secret: match[2],
      secure: true,
    });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'e42rd7k1',
      api_key: process.env.CLOUDINARY_API_KEY || '334943833419344',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'o3852jHh1zePctR_NhcB-eiAFZM',
      secure: true,
    });
  }
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format?: string;
  width?: number;
  height?: number;
}

export async function uploadPaymentQRToCloudinary(
  fileDataUriOrBuffer: string,
  userName: string,
  userId: string
): Promise<CloudinaryUploadResult> {
  const cleanName = (userName || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 30);
  const publicId = `qr_${cleanName}_${(userId || 'acc').slice(-6)}_${Date.now()}`;

  const res = await cloudinary.uploader.upload(fileDataUriOrBuffer, {
    folder: 'capflow/payment_qr',
    public_id: publicId,
    overwrite: true,
    resource_type: 'image',
    tags: ['capflow', 'payment_qr', cleanName],
  });

  return {
    url: res.secure_url || res.url,
    publicId: res.public_id,
    format: res.format,
    width: res.width,
    height: res.height,
  };
}

export async function deletePaymentQRFromCloudinary(publicId: string): Promise<boolean> {
  if (!publicId) return false;
  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res.result === 'ok';
  } catch (err) {
    console.error('Failed to delete asset from Cloudinary:', err);
    return false;
  }
}

export default cloudinary;
