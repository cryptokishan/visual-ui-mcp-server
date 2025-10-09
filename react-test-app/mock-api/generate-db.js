import { faker } from '@faker-js/faker';
import fs from "fs";
import path from "path";

// Configure faker
faker.seed(123);

// Define dynamic product generators for each category
const productGenerators = {
  electronics: () => {
    const brands = ["Apple", "Samsung", "Sony", "Dell", "HP", "Lenovo", "Microsoft", "LG"];
    const types = ["Laptop", "Smartphone", "Tablet", "Headphones", "Smartwatch", "Monitor", "Gaming Console"];

    const brand = faker.helpers.arrayElement(brands);
    const type = faker.helpers.arrayElement(types);
    const model = faker.lorem.words(2);

    return {
      name: `${brand} ${model.charAt(0).toUpperCase() + model.slice(1)} ${type}`,
      description: `Premium ${type.toLowerCase()} from ${brand} featuring advanced technology and modern design. Perfect for digital lifestyles with powerful performance and elegant aesthetics.`
    };
  },
  books: () => {
    const topics = ["Programming", "Design", "Business", "Science", "History", "Fiction", "Biography", "Self-Help"];
    const styles = ["Guide", "Handbook", "Manual", "Essentials", "Mastery", "Principles", "Fundamentals", "Complete"];

    const topic = faker.helpers.arrayElement(topics);
    const style = faker.helpers.arrayElement(styles);
    const subtitle = faker.lorem.words(3);

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

    const brand = faker.helpers.arrayElement(brands);
    const type = faker.helpers.arrayElement(types);
    const material = faker.helpers.arrayElement(materials);
    const color = faker.helpers.arrayElement(colors);

    return {
      name: `${brand} ${color} ${type}`,
      description: `High-quality ${type.toLowerCase()} made from premium ${material}. Designed by ${brand} for comfort and style. Features modern fit and long-lasting durability with excellent craftsmanship.`
    };
  },
  home: () => {
    const types = ["Blender", "Coffee Maker", "Vacuum Cleaner", "Air Fryer", "Dishwasher", "Washing Machine", "Refrigerator", "Microwave"];
    const brands = ["KitchenAid", "Breville", "Dyson", "Instant Pot", "Nespresso", "IKEA", "Samsung", "LG"];
    const features = ["energy-efficient", "smart home compatible", "quiet operation", "multiple settings", "easy cleaning", "compact design"];

    const type = faker.helpers.arrayElement(types);
    const brand = faker.helpers.arrayElement(brands);
    const feature = faker.helpers.arrayElement(features);

    return {
      name: `${brand} Professional ${type}`,
      description: `Professional-grade ${type.toLowerCase()} featuring ${feature} technology. From ${brand}, this appliance delivers exceptional performance with modern styling and reliable operation for everyday home use.`
    };
  },
  sports: () => {
    const brands = ["Nike", "Adidas", "Under Armour", "Puma", "Reebok", "Wilson", "Titleist", "Callaway"];
    const types = ["Running Shoes", "Yoga Mat", "Dumbbells", "Tennis Racket", "Basketball", "Fitness Tracker", "Swim Goggles", "Baseball Glove"];
    const features = ["professional-grade", "lightweight design", "shock absorption", "breathable fabric", "water-resistant", "adjustable fit"];

    const brand = faker.helpers.arrayElement(brands);
    const type = faker.helpers.arrayElement(types);
    const feature = faker.helpers.arrayElement(features);

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

// Create single test user as specified
const testUser = {
  id: 1,
  username: "test",
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
  password: "testpassword", // In production this would be hashed
  avatar: `https://ui-avatars.com/api/?name=Test+User&background=random&size=200&color=fff&format=png`,
  role: "user",
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

db.users.push(testUser);

// Generate additional users for demo purposes (keeping only one for now as per requirements)
for (let i = 0; i < 0; i++) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const avatarUrl = `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random&size=200&color=fff&format=png`;

  db.users.push({
    id: faker.number.int({ min: 2, max: 1000 }),
    username: faker.internet.username(),
    email: faker.internet.email(),
    firstName: firstName,
    lastName: lastName,
    avatar: avatarUrl,
    role: faker.helpers.arrayElement(["user", "admin", "moderator"]),
    isActive: faker.datatype.boolean(),
    createdAt: faker.date.recent().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
  });
}

// Generate posts
for (let i = 0; i < 30; i++) {
  const userId = faker.helpers.arrayElement(db.users.map((u) => u.id));
  const postThemes = [
    "Exploring new technologies",
    "Tips for better development",
    "Product reviews and analysis",
    "Industry insights and trends",
    "Personal development journey",
    "Best practices and tutorials"
  ];
  const randomTheme = faker.helpers.arrayElement(postThemes);

  db.posts.push({
    id: faker.number.int({ min: 1, max: 1000 }),
    title: `${randomTheme}: ${faker.lorem.words(3)}`,
    content: `This article explores ${randomTheme.toLowerCase()} in detail, providing insights and practical guidance for developers and tech enthusiasts. ${faker.lorem.sentences({ min: 5, max: 15 })}. The key takeaway is that understanding the fundamentals is crucial for long-term success.`,
    authorId: userId,
    tags: faker.lorem.words(3).split(' '),
    publishDate: faker.date.recent().toISOString(),
    status: faker.helpers.arrayElement(["draft", "published", "archived"]),
    views: faker.number.int({ min: 0, max: 10000 }),
    likes: faker.number.int({ min: 0, max: 500 }),
  });
}

// Generate products with realistic data
let productId = 1;
const categories = Object.keys(productGenerators);

for (const category of categories) {
  const numProducts = Math.floor(25 / categories.length) + faker.number.int({ min: -2, max: 2 });

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
        price = faker.number.float({ min: 299, max: 2499, precision: 0.01 });
        break;
      case 'books':
        price = faker.number.float({ min: 9.99, max: 89.99, precision: 0.01 });
        break;
      case 'clothing':
        price = faker.number.float({ min: 29.99, max: 299.99, precision: 0.01 });
        break;
      case 'home':
        price = faker.number.float({ min: 19.99, max: 899.99, precision: 0.01 });
        break;
      case 'sports':
        price = faker.number.float({ min: 24.99, max: 699.99, precision: 0.01 });
        break;
      default:
        price = faker.number.float({ min: 10, max: 1000, precision: 0.01 });
    }

    db.products.push({
      id: productId++,
      name: product.name,
      description: product.description,
      price: Math.round(price * 100) / 100, // Round to 2 decimal places
      category: category,
      images: images,
      stock: faker.number.int({ min: 0, max: 100 }),
      rating: Number((Math.random() * 2 + 3).toFixed(1)), // 3.0 to 5.0 range
    });
  }
}

// Fill remaining products if needed
while (db.products.length < 25) {
  const category = faker.helpers.arrayElement(categories);
  const product = productGenerators[category]();

  const images = [];
  for (let j = 0; j < 3; j++) {
    images.push(`https://picsum.photos/800/600?random=${productId}-${j}`);
  }

  let price;
  switch (category) {
    case 'electronics':
      price = faker.number.float({ min: 299, max: 2499, precision: 0.01 });
      break;
    case 'books':
      price = faker.number.float({ min: 9.99, max: 89.99, precision: 0.01 });
      break;
    case 'clothing':
      price = faker.number.float({ min: 29.99, max: 299.99, precision: 0.01 });
      break;
    case 'home':
      price = faker.number.float({ min: 19.99, max: 899.99, precision: 0.01 });
      break;
    case 'sports':
      price = faker.number.float({ min: 24.99, max: 699.99, precision: 0.01 });
      break;
    default:
      price = faker.number.float({ min: 10, max: 1000, precision: 0.01 });
  }

  db.products.push({
    id: productId++,
    name: product.name + " (Limited Edition)",
    description: product.description,
    price: Math.round(price * 100) / 100,
    category: category,
    images: images,
    stock: faker.number.int({ min: 0, max: 100 }),
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
  const userId = faker.helpers.arrayElement(db.users.map((u) => u.id));
  const template = faker.helpers.arrayElement(notificationTemplates);

  db.notifications.push({
    id: faker.number.int({ min: 1, max: 1000 }),
    type: template.type,
    title: template.title,
    message: template.message,
    userId: userId,
    isRead: faker.datatype.boolean(),
    createdAt: faker.date.recent().toISOString(),
  });
}

console.log("Mock database generated successfully!");
fs.writeFileSync(path.join("mock-api/db.json"), JSON.stringify(db, null, 2));
console.log("Mock data saved to mock-api/db.json");

export default db;
