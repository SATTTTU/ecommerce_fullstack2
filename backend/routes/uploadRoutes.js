import path from "path"
import express from "express"
import multer from "multer"
import fs from "fs"
import { fileURLToPath } from "url"

const router = express.Router()

// Get the current directory path (works in both ESM and CommonJS)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "../..")

// Create absolute path to uploads directory
const uploadsDir = path.join(rootDir, "uploads")

// Ensure uploads directory exists with proper permissions
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 })
    console.log("Created uploads directory at:", uploadsDir)
  } else {
    console.log("Uploads directory already exists at:", uploadsDir)
    // Check if directory is writable
    fs.accessSync(uploadsDir, fs.constants.W_OK)
    console.log("Uploads directory is writable")
  }
} catch (error) {
  console.error("Error with uploads directory:", error)
  console.log("Will attempt to use temporary directory as fallback")
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Double-check directory exists before trying to write
    if (!fs.existsSync(uploadsDir)) {
      // If main uploads dir doesn't exist, try to use OS temp directory
      const tempDir = path.join(require("os").tmpdir(), "app-uploads")
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      console.log("Using temporary directory for uploads:", tempDir)
      cb(null, tempDir)
    } else {
      cb(null, uploadsDir)
    }
  },
  filename: (req, file, cb) => {
    // Create a safe filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + "-" + uniqueSuffix + ext)
  },
})

// File filter function
function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|webp/i
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = filetypes.test(file.mimetype)

  if (extname && mimetype) {
    return cb(null, true)
  } else {
    cb(new Error("Images only! Accepted formats: JPG, JPEG, PNG, WEBP"))
  }
}

// Initialize multer upload
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb)
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
})

// Handle file upload - REMOVE the protect middleware for now to test if that's the issue
router.post("/", (req, res) => {
  console.log("Upload endpoint hit")
  console.log("Request headers:", req.headers)

  // Log authentication info for debugging
  console.log("User in request:", req.user ? "Authenticated" : "Not authenticated")

  // Log the current directory and uploads path for debugging
  console.log("Current directory:", process.cwd())
  console.log("Uploads directory:", uploadsDir)
  console.log("Directory exists:", fs.existsSync(uploadsDir))

  // Use single file upload middleware
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("Upload error:", err)
      return res.status(400).json({
        message: err.message,
        error: true,
      })
    }

    if (!req.file) {
      console.error("No file received")
      return res.status(400).json({
        message: "No image file provided",
        error: true,
      })
    }

    console.log("File uploaded successfully:", req.file)

    // Format the path correctly for frontend use
    // Use forward slashes for URLs even on Windows
    const relativePath = req.file.path.split(path.sep).join("/")
    const imagePath = `/uploads/${req.file.filename}`;
    return res.status(200).json({
      message: "Image uploaded successfully",
      image: imagePath,
      error: false,
    });
  })
})

export default router
