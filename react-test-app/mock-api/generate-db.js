import casual from "casual";
import fs from "fs";
import path from "path";

// Configure casual
casual.seed(123);

// Define dynamic product generators for each category
const productGenerators = {
  electronics: () => {
    const brands = ["Apple", "Samsung", "Sony", "Dell", "HP", "Lenovo", "Microsoft", "LG"];
    const types = ["Laptop", "Smartphone", "Tablet", "Headphones", "Smartwatch", "Monitor", "Gaming Console"];

    const brand = casual.random_element(brands);
    const type = casual.random_element(types);
    const model = casual.words(2);

    return {
      name: `${brand} ${model.charAt(0).toUpperCase() + model.slice(1)} ${type}`,
      description: `Premium ${type.toLowerCase()} from ${brand} featuring advanced technology and modern design. Perfect for digital lifestyles with powerful performance and elegant aesthetics.`
    };
  },
  books: () => {
    const topics = ["Programming", "Design", "Business", "Science", "History", "Fiction", "Biography", "Self-Help"];
    const styles = ["Guide", "Handbook", "Manual", "Essentials", "Mastery", "Principles", "Fundamentals", "Complete"];

    const topic = casual.random_element(topics);
    const style = casual.random_element(styles);
    const subtitle = casual.words(3);

    return {
      name: `${topic}: ${subtitle.charAt(0).toUpperCase() + subtitle.slice(1)} ${style}`,
      description: `Comprehensive ${style.toLowerCase()} covering essential aspects of ${topic}. Written by industry experts with practical examples and real-world applications. Perfect for beginners and professionals alike.`
    };
  },
  clothing: () => {
    const brands = ["Nike", "Adidas", "Levi's", "H&M", "Zara", "Uniqlo", "Patagonia", "The North Face"];
    const types = ["T-Shirt", "Jeans", "Jacket", "Sneakers", "Hoodie", "Dress", "Sweater", "Pants"];
    const materials = ["cotton", "wool", "polyester", "denim", "leather", "synthetic", "organic cotton"];
    const colors = ["Black", "White", "Navy", "Gray", "Red", "Blue", "Green", "Pink"];

    const brand = casual.random_element(brands);
    const type = casual.random_element(types);
    const material = casual.random_element(materials);
    const color = casual.random_element(colors);

    return {
      name: `${brand} ${color} ${type}`,
      description: `High-quality ${type.toLowerCase()} made from premium ${material}. Designed by ${brand} for comfort and style. Features modern fit and long-lasting durability with excellent craftsmanship.`
    };
  },
  home: () => {
    const types = ["Blender", "Coffee Maker", "Vacuum Cleaner", "Air Fryer", "Dishwasher", "Washing Machine", "Refrigerator", "Microwave"];
    const brands = ["KitchenAid", "Breville", "Dyson", "Instant Pot", "Nespresso", "IKEA", "Samsung", "LG"];
    const features = ["energy-efficient", "smart home compatible", "quiet operation", "multiple settings", "easy cleaning", "compact design"];

    const type = casual.random_element(types);
    const brand = casual.random_element(brands);
    const feature = casual.random_element(features);

    return {
      name: `${brand} Professional ${type}`,
      description: `Professional-grade ${type.toLowerCase()} featuring ${feature} technology. From ${brand}, this appliance delivers exceptional performance with modern styling and reliable operation for everyday home use.`
    };
  },
  sports: () => {
    const brands = ["Nike", "Adidas", "Under Armour", "Puma", "Reebok", "Wilson", "Titleist", "Callaway"];
    const types = ["Running Shoes", "Yoga Mat", "Dumbbells", "Tennis Racket", "Basketball", "Fitness Tracker", "Swim Goggles", "Baseball Glove"];
    const features = ["professional-grade", "lightweight design", "shock absorption", "breathable fabric", "water-resistant", "adjustable fit"];

    const brand = casual.random_element(brands);
    const type = casual.random_element(types);
    const feature = casual.random_element(features);

    return {
      name: `${brand} Performance ${type}`,
      description: `Professional athletic ${type.toLowerCase()} with ${feature}. Trusted by athletes worldwide, this ${brand} product delivers exceptional quality and performance for serious training and competition.`
    };
  }
};

// Image base URLs for different categories - using working Unsplash URLs
const categoryImages = {
  electronics: "https://source.unsplash.com/featured/800x600/?laptop,technology,electronics",
  books: "https://source.unsplash.com/featured/800x600/?books,reading,literature",
  clothing: "https://source.unsplash.com/featured/800x600/?fashion,clothes,style",
  home: "https://source.unsplash.com/featured/800x600/?home,interior,house",
  sports: "https://source.unsplash.com/featured/800x600/?sports,gym,fitness"
};

// Define models structure
const db = {
  users: [],
  posts: [],
  products: [],
  notifications: [],
};

// Generate users
for (let i = 0; i < 20; i++) {
  const firstName = casual.first_name;
  const lastName = casual.last_name;
  const avatarUrl = `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random&size=200&color=fff&format=png`;

  db.users.push({
    id: casual.integer(1, 1000),
    username: casual.username,
    email: casual.email,
    firstName: firstName,
    lastName: lastName,
    avatar: avatarUrl,
    role: casual.random_element(["user", "admin", "moderator"]),
    isActive: casual.coin_flip,
    createdAt: casual.date("YYYY-MM-DDTHH:mm:ss[Z]"),
    updatedAt: casual.date("YYYY-MM-DDTHH:mm:ss[Z]"),
  });
}

// Generate posts
for (let i = 0; i < 30; i++) {
  const userId = casual.random_element(db.users.map((u) => u.id));
  const postThemes = [
    "Exploring new technologies",
    "Tips for better development",
    "Product reviews and analysis",
    "Industry insights and trends",
    "Personal development journey",
    "Best practices and tutorials"
  ];
  const randomTheme = casual.random_element(postThemes);

  db.posts.push({
    id: casual.integer(1, 1000),
    title: `${randomTheme}: ${casual.words(3)}`,
    content: `This article explores ${randomTheme.toLowerCase()} in detail, providing insights and practical guidance for developers and tech enthusiasts. ${casual.sentences(Math.floor(Math.random() * 10) + 5)}. The key takeaway is that understanding the fundamentals is crucial for long-term success.`,
    authorId: userId,
    tags: casual.array_of_words(3),
    publishDate: casual.date("YYYY-MM-DDTHH:mm:ss[Z]"),
    status: casual.random_element(["draft", "published", "archived"]),
    views: casual.integer(0, 10000),
    likes: casual.integer(0, 500),
  });
}

// Generate products with realistic data
let productId = 1;
const categories = Object.keys(productGenerators);

for (const category of categories) {
  const numProducts = Math.floor(25 / categories.length) + casual.integer(-2, 2);

  for (let i = 0; i < numProducts && productId <= 25; i++) {
    const product = productGenerators[category]();
    const baseImageUrl = categoryImages[category];

    // Create multiple relevant images for each product using picum.photos as a fallback since unsplash is not working
    const images = [];
    for (let j = 0; j < 3; j++) {
      images.push(`https://picsum.photos/800/600?random=${productId}-${j}`);
    }

    // Price ranges based on category
    let price;
    switch (category) {
      case 'electronics':
        price = casual.double(299, 2499);
        break;
      case 'books':
        price = casual.double(9.99, 89.99);
        break;
      case 'clothing':
        price = casual.double(29.99, 299.99);
        break;
      case 'home':
        price = casual.double(19.99, 899.99);
        break;
      case 'sports':
        price = casual.double(24.99, 699.99);
        break;
      default:
        price = casual.double(10, 1000);
    }

    db.products.push({
      id: productId++,
      name: product.name,
      description: product.description,
      price: Math.round(price * 100) / 100, // Round to 2 decimal places
      category: category,
      images: images,
      stock: casual.integer(0, 100),
      rating: Number((Math.random() * 2 + 3).toFixed(1)), // 3.0 to 5.0 range
    });
  }
}

// Fill remaining products if needed
while (db.products.length < 25) {
  const category = casual.random_element(categories);
  const product = productGenerators[category]();

  const images = [];
  for (let j = 0; j < 3; j++) {
    images.push(`https://picsum.photos/800/600?random=${productId}-${j}`);
  }

  let price;
  switch (category) {
    case 'electronics':
      price = casual.double(299, 2499);
      break;
    case 'books':
      price = casual.double(9.99, 89.99);
      break;
    case 'clothing':
      price = casual.double(29.99, 299.99);
      break;
    case 'home':
      price = casual.double(19.99, 899.99);
      break;
    case 'sports':
      price = casual.double(24.99, 699.99);
      break;
    default:
      price = casual.double(10, 1000);
  }

  db.products.push({
    id: productId++,
    name: product.name + " (Limited Edition)",
    description: product.description,
    price: Math.round(price * 100) / 100,
    category: category,
    images: images,
    stock: casual.integer(0, 100),
    rating: Number((Math.random() * 2 + 3).toFixed(1)),
  });
}

// Generate notifications
const notificationTemplates = [
  { type: "info", title: "Information", message: "Here's an important update about your account." },
  { type: "warning", title: "Action Required", message: "Please review your account settings." },
  { type: "success", title: "Success", message: "Your recent action was completed successfully." },
  { type: "error", title: "Error", message: "Something went wrong with your recent request." },
  { type: "info", title: "New Features Available", message: "Check out the latest features we've added." },
  { type: "success", title: "Password Updated", message: "Your password has been changed successfully." },
  { type: "warning", title: "Storage Alert", message: "You're running low on storage space." },
  { type: "info", title: "Security Update", message: "Your account security has been enhanced." }
];

for (let i = 0; i < 15; i++) {
  const userId = casual.random_element(db.users.map((u) => u.id));
  const template = casual.random_element(notificationTemplates);

  db.notifications.push({
    id: casual.integer(1, 1000),
    type: template.type,
    title: template.title,
    message: template.message,
    userId: userId,
    isRead: casual.coin_flip,
    createdAt: casual.date("YYYY-MM-DDTHH:mm:ss[Z]"),
  });
}

console.log("Mock database generated successfully!");
fs.writeFileSync(path.join("mock-api/db.json"), JSON.stringify(db, null, 2));
console.log("Mock data saved to mock-api/db.json");

export default db;
