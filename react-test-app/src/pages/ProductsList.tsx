import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "react-aria-components";
import { useNavigate } from "react-router-dom";

// Mock API call function using proxy paths
const fetchData = async (endpoint: string) => {
  const response = await fetch(`/api/${endpoint}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  return response.json();
};

function ProductsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchData("products"),
  });

  const categories = [
    ...new Set(products?.map((product: any) => product.category)),
  ]
    .filter(Boolean)
    .map((category) => category as string);

  const filteredProducts =
    products?.filter((product: any) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        !selectedCategory || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }) || [];

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                PRAX
              </div>
              <Button
                onPress={handleBackToDashboard}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
              >
                ← Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Products
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  🔍
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600 dark:text-gray-400">
              Loading products...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: any) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md dark:hover:bg-gray-750 transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 overflow-hidden group"
                onClick={() => handleProductClick(product.id.toString())}
              >
                {/* Full Thumbnail Image with Complete Overlay */}
                <div className="relative w-full bg-gray-100 dark:bg-gray-700 overflow-hidden rounded-lg"
                     style={{ aspectRatio: '0.83/1' }}> {/* 20% more height for enhanced visibility */}
                  <img
                    src={product.images?.[0]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Bottom 45% Radiant Gradient Overlay with Full Details */}
                  <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/95 via-black/80 via-black/60 to-transparent">
                    {/* All Details Overlaid on Image */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                      {/* Product Name */}
                      <h3 className="text-white font-bold text-lg leading-tight line-clamp-1">
                        {product.name}
                      </h3>

                      {/* Description */}
                      <p className="text-white/90 text-sm leading-tight line-clamp-2">
                        {product.description}
                      </p>

                      {/* Price and Stock */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-white font-bold text-xl">
                          ${product.price?.toFixed(2)}
                        </div>
                        <div className="text-white/80 text-sm flex items-center">
                          📦 {product.stock}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Layer Badges */}
                  <div className="absolute top-2 left-2 z-10">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-black/60 text-white backdrop-blur-sm">
                      {product.category}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 z-10">
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-black/60 text-white backdrop-blur-sm">
                      ⭐ {product.rating?.toFixed(1) || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ProductsList;
