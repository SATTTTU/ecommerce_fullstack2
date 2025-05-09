// packages
import path from "path"
import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"
import fs from "fs"
import { fileURLToPath } from "url"

// Utilities
import connectDB from "./config/db.js"
import userRoutes from "./routes/userRoutes.js"
import categoryRoutes from "./routes/categoryRoutes.js"
import productRoutes from "./routes/productRoutes.js"
import uploadRoutes from "./routes/uploadRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"

dotenv.config()
const port = process.env.PORT || 5000

connectDB()

const app = express()

// Get the current directory path (works in both ESM and CommonJS)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(rootDir, "uploads")
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true })
    console.log("Created uploads directory at:", uploadsDir)
  } catch (error) {
    console.error("Error creating uploads directory:", error)
  }
}

// Use CORS before defining routes
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend's URL
    credentials: true, // only if you're sending cookies (optional)
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use("/api/users", userRoutes)
app.use("/api/category", categoryRoutes)
app.use("/api/products", productRoutes)
app.use("/api/upload", uploadRoutes)
app.use("/api/orders", orderRoutes)

app.get("/api/config/paypal", (req, res) => {
  res.send({ clientId: process.env.PAYPAL_CLIENT_ID })
})

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(rootDir, "uploads")))

// Add a test route to check if uploads directory exists
app.get("/api/check-uploads", (req, res) => {
  const exists = fs.existsSync(uploadsDir)
  const isWritable = exists ? fs.accessSync(uploadsDir, fs.constants.W_OK) : false

  res.json({
    uploadsDir,
    exists,
    isWritable: isWritable === undefined, // If no error was thrown, it's writable
    cwd: process.cwd(),
  })
})

app.listen(port, () => console.log(`Server running on port: ${port}`))
