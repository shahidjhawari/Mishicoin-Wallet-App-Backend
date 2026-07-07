const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Profile pictures go to their own Cloudinary folder, separate from
// deposit screenshots, and are cropped to a square avatar automatically.
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "mishicoin/profiles",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    public_id: `${req.user?._id || "anon"}-avatar`,
    overwrite: true, // re-uploading replaces the old avatar instead of piling up
    transformation: [{ width: 512, height: 512, crop: "fill", gravity: "face", quality: "auto" }],
  }),
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed"), false);
  }
};

const uploadProfile = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max
});

module.exports = uploadProfile;
