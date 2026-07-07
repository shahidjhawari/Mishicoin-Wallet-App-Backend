const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Deposit screenshots are streamed straight to Cloudinary — nothing is
// ever written to local disk, so this works on ephemeral hosts too
// (Render, Vercel, Heroku, etc.) where local files don't persist.
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "mc",
    resource_type: "image",
    // Keep files organized and traceable back to the uploading user
    public_id: `${req.user?._id || "anon"}-${Date.now()}`,
    transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
  }),
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

module.exports = upload;
