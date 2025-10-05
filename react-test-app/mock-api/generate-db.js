import casual from "casual";
import fs from "fs";
import path from "path";

// Configure casual
casual.seed(123);

// Define models structure
const db = {
  users: [],
  posts: [],
  products: [],
  notifications: [],
};

// Generate users
for (let i = 0; i < 20; i++) {
  db.users.push({
    id: casual.integer(1, 1000),
    username: casual.username,
    email: casual.email,
    firstName: casual.first_name,
    lastName: casual.last_name,
    avatar: "https://picsum.photos/400/400?random=" + casual.integer(1, 1000),
    role: casual.random_element(["user", "admin", "moderator"]),
    isActive: casual.coin_flip,
    createdAt: casual.date("YYYY-MM-DDTHH:mm:ss[Z]"),
    updatedAt: casual.date("YYYY-MM-DDTHH:mm:ss[Z]"),
  });
}

// Generate posts
for (let i = 0; i < 30; i++) {
  const userId = casual.random_element(db.users.map((u) => u.id));
  db.posts.push({
    id: casual.integer(1, 1000),
    title: casual.sentence,
    content: casual.text,
    authorId: userId,
    tags: casual.array_of_words(3),
    publishDate: casual.date("YYYY-MM-DDTHH:mm:ss[Z]"),
    status: casual.random_element(["draft", "published", "archived"]),
    views: casual.integer(0, 10000),
    likes: casual.integer(0, 500),
  });
}

// Generate products
for (let i = 0; i < 25; i++) {
  db.products.push({
    id: casual.integer(1, 1000),
    name: casual.title,
    description: casual.sentences(2),
    price: casual.double(10, 1000),
    category: casual.random_element([
      "electronics",
      "books",
      "clothing",
      "home",
      "sports",
    ]),
    images: [
      "https://picsum.photos/800/600?random=" + casual.integer(1, 1000),
      "https://picsum.photos/800/600?random=" + casual.integer(1001, 2000),
      "https://picsum.photos/800/600?random=" + casual.integer(2001, 3000)
    ],
    stock: casual.integer(0, 100),
    rating: casual.double(1, 5),
  });
}

// Generate notifications
for (let i = 0; i < 15; i++) {
  const userId = casual.random_element(db.users.map((u) => u.id));
  db.notifications.push({
    id: casual.integer(1, 1000),
    type: casual.random_element(["info", "warning", "success", "error"]),
    title: casual.title,
    message: casual.sentences(1),
    userId: userId,
    isRead: casual.coin_flip,
    createdAt: casual.date("YYYY-MM-DDTHH:mm:ss[Z]"),
  });
}

console.log("Mock database generated successfully!");
fs.writeFileSync(path.join("mock-api/db.json"), JSON.stringify(db, null, 2));
console.log("Mock data saved to mock-api/db.json");

export default db;
