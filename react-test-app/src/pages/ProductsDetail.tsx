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

            {/* Thumbnail Images */}
            {product.images?.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden border-2 ${
                      selectedImage === index
                        ? "border-emerald-500"
                        : "border-gray-200"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
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
                <div className="text-sm text-gray-500">
                  📦 {product.stock} in stock
                </div>
              </div>
            </div>

            <div>
              <p className="text-gray-700 text-lg leading-relaxed">
                {product.description}
              </p>
            </div>

            <div>
              <div className="text-4xl font-bold text-gray-900 mb-4">
                ${product.price?.toFixed(2)}
              </div>
              <div className="flex space-x-3">
                <Button className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors">
                  🛒 Add to Cart
                </Button>
                <Button className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                  👍 Wishlist
                </Button>
              </div>
            </div>

            {/* Comprehensive Product Details */}
            <div className="border-t border-gray-200 pt-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Product Details
              </h3>

              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Category
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize font-medium">
                      {product.category}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Stock Status
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
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
                    <dt className="text-sm font-medium text-gray-500">
                      Customer Rating
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 flex items-center">
                      <div className="flex items-center mr-2">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${
                              i < Math.floor(product.rating || 0)
                                ? "text-yellow-400"
                                : "text-gray-300"
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
                    <dt className="text-sm font-medium text-gray-500">
                      Price Range
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          product.price > 500
                            ? "bg-purple-100 text-purple-800"
                            : product.price > 100
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
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
                    <dt className="text-sm font-medium text-gray-500">
                      Product ID
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded">
                      #{product.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Gallery
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {product.images?.length || 0} high-quality images
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Additional Specifications */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Specifications
                </h4>
                <dl className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <dt className="text-sm text-gray-600">SKU/Model</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {product.name.split(" ").join("-").toUpperCase()}-
                      {product.id}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <dt className="text-sm text-gray-600">Condition</dt>
                    <dd className="text-sm font-medium text-green-600">New</dd>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <dt className="text-sm text-gray-600">Shipping</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      Free shipping available
                    </dd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <dt className="text-sm text-gray-600">Customer Reviews</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {Math.floor(Math.random() * 50) + 10} reviews
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Care Instructions */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Important Information
                </h4>
                <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
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
        <div className="mt-16 border-t border-gray-200 pt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Related Products
          </h2>
          <p className="text-gray-600 mb-8">
            More products from the {product.category} category
          </p>

          {relatedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct: any) => (
                <div
                  key={relatedProduct.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer border border-gray-200 overflow-hidden"
                  onClick={() => navigate(`/products/${relatedProduct.id}`)}
                >
                  <div className="aspect-w-1 aspect-h-1 bg-gray-200 overflow-hidden">
                    <img
                      src={relatedProduct.images?.[0]}
                      alt={relatedProduct.name}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                      {relatedProduct.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      ${relatedProduct.price?.toFixed(2)}
                    </p>
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {relatedProduct.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-12">
              <div className="text-4xl mb-4">📦</div>
              <p>No related products found in this category.</p>
              <Button
                onPress={handleBackToProducts}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
