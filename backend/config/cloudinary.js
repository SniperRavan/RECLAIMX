/**
 * cloudinary.js
 *
 * Cloudinary v2 setup + upload helper.
 *
 * WHY THIS CHANGED:
 * The original code used multer-storage-cloudinary which:
 *   1. Only works with Cloudinary v1 (deprecated)
 *   2. Is an abandoned package with unresolved issues
 *
 * The new approach is:
 *   1. multer with memoryStorage (stores file in RAM temporarily)
 *   2. cloudinary.uploader.upload_stream() to push it directly to Cloudinary
 *
 * This is the officially recommended pattern for Cloudinary v2 + multer.
 */

const cloudinary = require('cloudinary').v2;
const multer     = require('multer');
const streamifier = require('streamifier'); // tiny util — add to package.json if not there

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true, // always use https
});

// multer uses memory storage — files never touch disk
// This is safer and simpler for a serverless/Railway deployment
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
    files: 2,                  // max 2 images per report
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
    cb(null, true);
  },
});

/**
 * uploadToCloudinary(fileBuffer, folder)
 *
 * Wraps Cloudinary's upload_stream in a Promise so we can use async/await.
 * The folder parameter organises uploads in Cloudinary's media library.
 *
 * @param {Buffer} fileBuffer - The file buffer from multer memoryStorage
 * @param {string} folder     - Cloudinary folder name (e.g. 'reclaimx/lost-items')
 * @returns {Promise<{url: string, public_id: string}>}
 */
function uploadToCloudinary(fileBuffer, folder = 'reclaimx') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Auto-compress and convert to webp for smaller file sizes
        transformation: [
          { quality: 'auto:good', fetch_format: 'auto', width: 1200, crop: 'limit' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );

    // streamifier converts a buffer into a readable stream for Cloudinary
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}

/**
 * deleteFromCloudinary(publicId)
 * Used when an item is deleted or a user account is removed.
 */
async function deleteFromCloudinary(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    // Log but don't throw — a failed image deletion shouldn't break the main flow
    console.error('[Cloudinary] Failed to delete image:', publicId, err.message);
  }
}

module.exports = { cloudinary, upload, uploadToCloudinary, deleteFromCloudinary };