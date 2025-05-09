import { PRODUCT_URL, UPLOAD_URL } from "../constants"
import { apiSlice } from "./apiSlice"

export const productApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: ({ keyword }) => ({
        url: `${PRODUCT_URL}`,
        params: { keyword },
      }),
      keepUnusedDataFor: 5,
      providesTags: ["Products"],
    }),

    getProductById: builder.query({
      query: (productId) => `${PRODUCT_URL}/${productId}`,
      providesTags: (result, error, productId) => [{ type: "Product", id: productId }],
    }),

    allProducts: builder.query({
      query: () => `${PRODUCT_URL}/allProducts`,
    }),

    getProductDetails: builder.query({
      query: (productId) => ({
        url: `${PRODUCT_URL}/${productId}`,
      }),
      keepUnusedDataFor: 5,
    }),

    createProduct: builder.mutation({
      query: (productData) => ({
        url: `${PRODUCT_URL}`,
        method: "POST",
        body: productData,
      }),
      invalidatesTags: ["Product"],
    }),

    updateProduct: builder.mutation({
      query: ({ productId, formData }) => ({
        url: `${PRODUCT_URL}/${productId}`,
        method: "PUT",
        body: formData,
      }),
    }),

    uploadProductImage: builder.mutation({
      query: (data) => {
        // Log the upload URL for debugging
        console.log("Uploading to:", UPLOAD_URL)

        // Log FormData entries for debugging (can't directly log FormData)
        if (process.env.NODE_ENV !== "production") {
          try {
            for (const pair of data.entries()) {
              console.log("FormData entry:", pair[0], pair[1].name)
            }
          } catch (error) {
            console.log("Error logging FormData:", error)
          }
        }

        return {
          url: `${UPLOAD_URL}`,
          method: "POST",
          body: data,
          // Don't set Content-Type header - browser will set it with boundary for FormData
          // Add credentials to ensure cookies are sent if needed
          credentials: "include",
        }
      },
      // Add onQueryStarted for additional debugging
      async onQueryStarted(arg, { queryFulfilled, getState }) {
        try {
          // Get auth state to log authentication status
          const { auth } = getState()
          console.log("Auth state during upload:", auth.userInfo ? "User authenticated" : "No user auth")

          const result = await queryFulfilled
          console.log("Upload successful:", result.data)
        } catch (error) {
          console.error("Upload failed:", error)
        }
      },
    }),

    deleteProduct: builder.mutation({
      query: (productId) => ({
        url: `${PRODUCT_URL}/${productId}`,
        method: "DELETE",
      }),
      providesTags: ["Product"],
    }),

    createReview: builder.mutation({
      query: (data) => ({
        url: `${PRODUCT_URL}/${data.productId}/reviews`,
        method: "POST",
        body: data,
      }),
    }),

    getTopProducts: builder.query({
      query: () => `${PRODUCT_URL}/top`,
      keepUnusedDataFor: 5,
    }),

    getNewProducts: builder.query({
      query: () => `${PRODUCT_URL}/new`,
      keepUnusedDataFor: 5,
    }),

    getFilteredProducts: builder.query({
      query: ({ checked, radio }) => ({
        url: `${PRODUCT_URL}/filtered-products`,
        method: "POST",
        body: { checked, radio },
      }),
    }),
  }),
})

export const {
  useGetProductByIdQuery,
  useGetProductsQuery,
  useGetProductDetailsQuery,
  useAllProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateReviewMutation,
  useGetTopProductsQuery,
  useGetNewProductsQuery,
  useUploadProductImageMutation,
  useGetFilteredProductsQuery,
} = productApiSlice
