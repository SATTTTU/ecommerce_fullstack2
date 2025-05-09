"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useCreateProductMutation, useUploadProductImageMutation } from "../../redux/api/productApiSlice"
import { useFetchCategoriesQuery } from "../../redux/api/categoryApiSlice"
import { toast } from "react-toastify"
import AdminMenu from "./AdminMenu"

const ProductCreate = () => {
  // Form fields to match backend requirements
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState("")
  const [quantity, setQuantity] = useState("")
  const [brand, setBrand] = useState("")
  const [countInStock, setCountInStock] = useState("")

  // Image handling
  const [imageFile, setImageFile] = useState(null)
  const [imagePath, setImagePath] = useState("")
  const [imagePreview, setImagePreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const navigate = useNavigate()

  const [uploadProductImage] = useUploadProductImageMutation()
  const [createProduct] = useCreateProductMutation()
  const { data: categories, isLoading: categoriesLoading } = useFetchCategoriesQuery()

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation matching backend requirements
    if (!name) return toast.error("Name is required")
    if (!brand) return toast.error("Brand is required")
    if (!description) return toast.error("Description is required")
    if (!price) return toast.error("Price is required")
    if (!category) return toast.error("Category is required")
    if (!quantity) return toast.error("Quantity is required")

    // Check if we have an image
    if (!imagePath) {
      return toast.error("Please upload a product image")
    }

    setIsSubmitting(true)

    try {
      // Create the product with the image path we got from the upload
      const productData = {
        name,
        description,
        price,
        category,
        quantity,
        brand,
        countInStock,
        image: imagePath, // This is the path returned from your multer upload
      }

      console.log("Creating product with data:", productData)

      const { data } = await createProduct(productData)

      if (data?.error) {
        toast.error(data?.error)
      } else {
        toast.success(`${data?.name || "Product"} has been created`)

        // Reset form
        setName("")
        setDescription("")
        setPrice("")
        setCategory("")
        setQuantity("")
        setBrand("")
        setCountInStock("")
        setImageFile(null)
        setImagePath("")
        setImagePreview(null)

        // Change this line to navigate to the correct route
        // Option 1: Navigate to admin dashboard instead
        navigate("/admin/dashboard")

        // Option 2: If you want to stay on the same page after creation
        // Just comment out the navigate line and add a success message
        // toast.success("Product created successfully! You can create another one.")
      }
    } catch (error) {
      console.error("Product creation error:", error)
      toast.error(error?.data?.message || error?.message || "Product creation failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // File validation
    if (!file.type.startsWith("image/")) {
      return toast.error("Please upload an image file")
    }

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image size must be less than 5MB")
    }

    // Show preview immediately for better UX
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)

    setImageFile(file)
    setIsUploading(true)

    // Create form data for image upload
    const formData = new FormData()
    formData.append("image", file)

    try {
      console.log("Uploading image:", file.name, "size:", file.size, "type:", file.type)

      // Upload image using the multer endpoint
      const res = await uploadProductImage(formData).unwrap()
      console.log("Upload response:", res)

      if (res.error) {
        throw new Error(res.message || "Upload failed")
      }

      toast.success(res.message || "Image uploaded successfully")
      setImagePath(res.image) // Store the image path returned from the server
    } catch (error) {
      console.error("Upload error details:", error)

      // More detailed error logging
      if (error.status) {
        console.error(`HTTP Status: ${error.status}`)
      }

      if (error.data) {
        console.error("Error response data:", error.data)
      }

      toast.error(
        error?.data?.message || error?.message || "Image upload failed. Please check your connection and try again.",
      )

      setImageFile(null)
      setImagePreview(null)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container xl:mx-[9rem] sm:mx-[0]">
      <div className="flex flex-col md:flex-row">
        <AdminMenu />
        <div className="md:w-3/4 p-3">
          <h2 className="h-12 text-2xl font-semibold">Create Product</h2>

          <form onSubmit={handleSubmit}>
            {/* Image Upload Section */}
            <div className="mb-3">
              {imagePreview && (
                <div className="text-center mb-3">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="product preview"
                    className="block mx-auto max-h-[200px]"
                  />
                </div>
              )}

              <label className="border text-white px-4 block w-full text-center rounded-lg cursor-pointer font-bold py-11 bg-[#101011] hover:bg-[#1c1c1e] transition">
                {isUploading ? "Uploading..." : imageFile ? imageFile.name : "Upload Image"}
                <input
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={uploadFileHandler}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
              {imagePath && <p className="text-green-500 text-sm mt-1">Image uploaded successfully</p>}
            </div>

            {/* Form Fields */}
            <div className="p-3">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[280px]">
                  <label htmlFor="name" className="block mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="p-4 mb-3 w-full border rounded-lg bg-[#101011] text-white"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1 min-w-[280px]">
                  <label htmlFor="price" className="block mb-1">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="price"
                    min="0"
                    step="0.01"
                    className="p-4 mb-3 w-full border rounded-lg bg-[#101011] text-white"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[280px]">
                  <label htmlFor="quantity" className="block mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    min="0"
                    className="p-4 mb-3 w-full border rounded-lg bg-[#101011] text-white"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1 min-w-[280px]">
                  <label htmlFor="brand" className="block mb-1">
                    Brand <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="brand"
                    className="p-4 mb-3 w-full border rounded-lg bg-[#101011] text-white"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="description" className="block mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  className="p-4 mb-3 w-full h-32 border rounded-lg bg-[#101011] text-white"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[280px]">
                  <label htmlFor="countInStock" className="block mb-1">
                    Count In Stock
                  </label>
                  <input
                    type="number"
                    id="countInStock"
                    min="0"
                    className="p-4 mb-3 w-full border rounded-lg bg-[#101011] text-white"
                    value={countInStock}
                    onChange={(e) => setCountInStock(e.target.value)}
                  />
                </div>

                <div className="flex-1 min-w-[280px]">
                  <label htmlFor="category" className="block mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    className="p-4 mb-3 w-full border rounded-lg bg-[#101011] text-white"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories?.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {categoriesLoading && <p className="text-sm text-gray-400">Loading categories...</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="py-4 px-10 mt-5 rounded-lg text-lg font-bold bg-pink-600 hover:bg-pink-700 transition disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProductCreate
