import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "react-aria-components";
import { useNavigate, useParams } from "react-router-dom";

// Mock API call function using proxy paths
const fetchData = async (endpoint: string) => {
  const response = await fetch(`/api/${endpoint}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  return response.json();
};

function ProductsDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [selectedImage, setSelectedImage] = useState(0);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["products", id],
    queryFn: () => fetchData(`products/${id}`),
  });

  const { data: allProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchData("products"),
  });

  const handleBackToProducts = () => {
    navigate("/products");
  };

  if (productLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">
          Loading product...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Product not found
          </h2>
          <Button
            onPress={handleBackToProducts}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  // Get related products based on category
  const relatedProducts =
    allProducts
      ?.filter(
        (p: any) =>
          p.category === product.category && p.id !== parseInt(id || "0")
      )
      .slice(0, 4) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button
              onPress={handleBackToProducts}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              ← Back to Products
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
              <img
                src={product.images?.[selectedImage] || product.images?.[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Immersive Thumbnail Gallery */}
            {product.images?.length > 1 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Product Gallery ({product.images.length} images)
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  {product.images.map((image: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`group relative w-full bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                        selectedImage === index
                          ? "ring-2 ring-emerald-500 ring-offset-2 shadow-lg shadow-emerald-500/25"
                          : "hover:shadow-md"
                      }`}
                      style={{ aspectRatio: '1.3/1' }} // 30% reduction in height (from 1:1 to 1:0.77)
                    >
                      {/* Full Immersive Image */}
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                      />

                      {/* Bottom 40% Radiant Gradient Overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
                        {/* Product Price Overlay */}
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white font-semibold text-sm leading-tight">
                            ${product.price?.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Active indicator */}
                      {selectedImage === index && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}

                      {/* Hover indicator */}
                      {selectedImage !== index && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="w-5 h-5 bg-white/90 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Click any thumbnail for immersive view
                </p>
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="space-y-6">
            <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {product.name}
              </h1>
              <div className="flex items-center space-x-4 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                  {product.category}
                </span>
                <div className="flex items-center space-x-1">
                  <span className="text-lg">⭐</span>
                  <span className="font-semibold">
                    {product.rating?.toFixed(1) || "N/A"}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  📦 {product.stock} in stock
                </div>
              </div>
            </div>

            <div>
              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                {product.description}
              </p>
            </div>

            <div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                ${product.price?.toFixed(2)}
              </div>
              <div className="flex space-x-3">
                <Button className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors">
                  🛒 Add to Cart
                </Button>
                <Button className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                  👍 Wishlist
                </Button>
              </div>
            </div>

            {/* Comprehensive Product Details */}
            <div className="border-t border-gray-200 pt-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Product Details
              </h3>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Category
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 capitalize font-medium">
                      {product.category}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Stock Status
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.stock > 50
                            ? "bg-green-100 text-green-800"
                            : product.stock > 10
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.stock > 50
                          ? "In Stock"
                          : product.stock > 10
                          ? "Low Stock"
                          : "Limited Stock"}
                      </span>
                      <span className="ml-2">({product.stock} units)</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Customer Rating
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 flex items-center">
                      <div className="flex items-center mr-2">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${
                              i < Math.floor(product.rating || 0)
                                ? "text-yellow-400"
                                : "text-gray-300 dark:text-gray-500"
                            }`}
                          >
                            ⭐
                          </span>
                        ))}
                      </div>
                      <span className="font-medium">
                        {product.rating?.toFixed(1) || "0.0"}/5.0
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Price Range
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          product.price > 500
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            : product.price > 100
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}
                      >
                        {product.price > 500
                          ? "Premium"
                          : product.price > 100
                          ? "Mid-range"
                          : "Budget"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Product ID
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono bg-white dark:bg-gray-700 px-2 py-1 rounded">
                      #{product.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Gallery
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {product.images?.length || 0} high-quality images
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Additional Specifications */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                  Specifications
                </h4>
                <dl className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-600">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">SKU/Model</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {product.name.split(" ").join("-").toUpperCase()}-
                      {product.id}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-600">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Condition</dt>
                    <dd className="text-sm font-medium text-green-600 dark:text-green-400">New</dd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-600">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Shipping</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Free shipping available
                    </dd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Customer Reviews</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {Math.floor(Math.random() * 50) + 10} reviews
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Care Instructions */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                  Important Information
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc list-inside">
                  <li>All prices include applicable taxes</li>
                  <li>Return policy: 30 days from delivery</li>
                  <li>
                    Warranty:{" "}
                    {product.category === "electronics"
                      ? "1 year manufacturer warranty"
                      : "6 months satisfaction guarantee"}
                  </li>
                  <li>Shipping typically takes 3-5 business days</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-16 border-t border-gray-200 dark:border-gray-700 pt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Related Products
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            More products from the {product.category} category
          </p>

          {relatedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct: any) => (
                <div
                  key={relatedProduct.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md dark:hover:bg-gray-750 transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 overflow-hidden group"
                  onClick={() => navigate(`/products/${relatedProduct.id}`)}
                >
                  {/* Immersive Related Product Image */}
                  <div className="relative w-full bg-gray-100 dark:bg-gray-700 overflow-hidden rounded-t-lg"
                       style={{ aspectRatio: '0.83/1' }}> {/* Same enhanced proportions */}
                    <img
                      src={relatedProduct.images?.[0]}
                      alt={relatedProduct.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Bottom 45% Radiant Gradient Overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/95 via-black/80 via-black/60 to-transparent">
                      {/* Name and Price Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2 mb-1">
                          {relatedProduct.name}
                        </h3>
                        <p className="text-white font-bold text-lg">
                          ${relatedProduct.price?.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-black/60 text-white backdrop-blur-sm">
                        {relatedProduct.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center py-12">
              <div className="text-4xl mb-4">📦</div>
              <p>No related products found in this category.</p>
              <Button
                onPress={handleBackToProducts}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Browse All Products
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProductsDetail;
