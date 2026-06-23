const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 5000);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_FILE = path.join(__dirname, "data.json");
const TOKEN_SECRET = process.env.TOKEN_SECRET || "hotel-portal-demo-secret";
const USE_MYSQL = process.env.DB_CLIENT === "mysql";
let mysqlPool;

const roomPhotos = [
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80"
];

const demoState = {
  users: [
      { id: 1, name: "SHAIK.ISMAIL", username: "ISMAIL", password: "ismail123", role: "admin" },
      { id: 2, name: "N.VYSHNAVI LAKSHMI", username: "VYSHNAVI", password: "vyshu123", role: "admin" },
      { id: 3, name: "D.NAGA SURYA", username: "NAGASURYA", password: "surya123", role: "admin" },
      { id: 4, name: "CH.THANUDEEP", username: "THANUDEEP", password: "thanu123", role: "admin" }
    ],
  rooms: [
    { id: 1, number: "204", type: "City King", price: 148, amenities: ["King bed", "Desk", "City view"], photo: roomPhotos[0] },
    { id: 2, number: "318", type: "Garden Double", price: 176, amenities: ["Two queens", "Balcony", "Breakfast"], photo: roomPhotos[1] },
    { id: 3, number: "412", type: "Executive Suite", price: 264, amenities: ["Lounge", "Tub", "Late checkout"], photo: roomPhotos[2] },
    { id: 4, number: "506", type: "Harbor Suite", price: 318, amenities: ["Sea view", "Mini bar", "Butler call"], photo: roomPhotos[3] },
    { id: 5, number: "611", type: "Family Loft", price: 232, amenities: ["Sleeps four", "Kitchenette", "Sofa bed"], photo: roomPhotos[4] },
    { id: 6, number: "720", type: "Penthouse", price: 480, amenities: ["Terrace", "Dining room", "Priority service"], photo: roomPhotos[5] }
  ],
  menu: [
    { id: 1, name: "Club sandwich", description: "Turkey, bacon, lettuce, tomato, and house chips.", price: 16, available: true },
    { id: 2, name: "Margherita pizza", description: "Hand-stretched crust, tomato, basil, and fresh mozzarella.", price: 18, available: true },
    { id: 3, name: "Cheese omelet", description: "Three eggs, cheddar, and breakfast potatoes.", price: 13, available: true },
    { id: 4, name: "Avocado toast", description: "Sourdough, smashed avocado, chili flakes, and lemon.", price: 12, available: true },
    { id: 5, name: "Caesar salad", description: "Romaine, parmesan, croutons, and Caesar dressing.", price: 14, available: true },
    { id: 6, name: "Tuna poke bowl", description: "Marinated tuna, rice, cucumber, avocado, and sesame.", price: 21, available: true },
    { id: 7, name: "Lobster roll", description: "Warm lobster, lemon mayo, and buttery roll.", price: 28, available: true },
    { id: 8, name: "Shrimp tacos", description: "Corn tortillas, spicy shrimp, slaw, and crema.", price: 17, available: true },
    { id: 9, name: "Quinoa grain bowl", description: "Quinoa, roasted vegetables, feta, and lemon tahini.", price: 15, available: true },
    { id: 10, name: "Beef burger", description: "Angus beef, cheddar, lettuce, tomato, and fries.", price: 19, available: true },
    { id: 11, name: "Chicken parmesan", description: "Breaded chicken, marinara, mozzarella, and spaghetti.", price: 22, available: true },
    { id: 12, name: "Seared salmon", description: "Herb butter salmon, roasted potatoes, and greens.", price: 26, available: true },
    { id: 13, name: "Steak frites", description: "Grilled sirloin, garlic butter, and crisp fries.", price: 30, available: true },
    { id: 14, name: "Mushroom risotto", description: "Creamy arborio rice with wild mushrooms and parmesan.", price: 20, available: true },
    { id: 15, name: "Truffle fries", description: "Crispy fries, truffle oil, parmesan, and parsley.", price: 11, available: true },
    { id: 16, name: "Breakfast burrito", description: "Eggs, chorizo, cheese, potatoes, and salsa verde.", price: 14, available: true },
    { id: 17, name: "Spinach artichoke dip", description: "Warm dip with chips and toasted baguette.", price: 13, available: true },
    { id: 18, name: "French onion soup", description: "Caramelized onion broth with melted gruyere.", price: 11, available: true },
    { id: 19, name: "Pad thai", description: "Rice noodles with shrimp, peanuts, bean sprouts, and tamarind.", price: 19, available: true },
    { id: 20, name: "Chicken tikka masala", description: "Creamy tomato curry with basmati rice and naan.", price: 22, available: true },
    { id: 21, name: "Veggie lasagna", description: "Layers of pasta, ricotta, spinach, and tomato sauce.", price: 18, available: true },
    { id: 22, name: "Sushi platter", description: "Assorted nigiri and rolls with soy, ginger, and wasabi.", price: 32, available: true },
    { id: 23, name: "Chocolate lava cake", description: "Warm chocolate cake with a molten center and vanilla ice cream.", price: 12, available: true },
    { id: 24, name: "Mango cheesecake", description: "Creamy cheesecake topped with fresh mango glaze.", price: 11, available: true },
    { id: 25, name: "Espresso martini", description: "Vodka, espresso, and coffee liqueur with a crema finish.", price: 14, available: true }
  ],
  bookings: [
    { id: 101, userId: 1, guest: "Maya Patel", roomId: 3, checkIn: "2026-06-22", checkOut: "2026-06-25", status: "confirmed" },
    { id: 102, userId: 1, guest: "Jordan Lee", roomId: 1, checkIn: "2026-06-24", checkOut: "2026-06-27", status: "confirmed" }
  ],
  requests: [
    { id: 201, bookingId: 101, type: "food_order", description: "Paneer tikka, lime soda, and two plates.", status: "new", createdAt: "2026-06-22T09:20:00.000Z" },
    { id: 202, bookingId: 102, type: "maintenance", description: "Air conditioner is cooling slowly.", status: "in_progress", createdAt: "2026-06-22T10:05:00.000Z" }
  ]
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getMysqlConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "hotel_portal",
    waitForConnections: true,
    connectionLimit: 10
  };
}

async function getMysqlPool() {
  if (mysqlPool) return mysqlPool;

  let mysql;
  try {
    mysql = require("mysql2/promise");
  } catch {
    throw new Error("MySQL mode requires mysql2. Run: npm install");
  }

  mysqlPool = mysql.createPool(getMysqlConfig());
  await mysqlPool.query("SELECT 1");
  return mysqlPool;
}

async function readMysqlState() {
  const pool = await getMysqlPool();
  const [users] = await pool.query("SELECT id, name, username, password, role FROM users ORDER BY id");
  const [rooms] = await pool.query("SELECT id, room_number AS number, type, price, amenities, photo FROM rooms ORDER BY id");
  const [menu] = await pool.query("SELECT id, name, description, price, available FROM menu_items ORDER BY id");
  const [bookings] = await pool.query(
    "SELECT id, user_id AS userId, guest, room_id AS roomId, DATE_FORMAT(check_in, '%Y-%m-%d') AS checkIn, DATE_FORMAT(check_out, '%Y-%m-%d') AS checkOut, status FROM bookings ORDER BY id DESC"
  );
  const [requests] = await pool.query(
    "SELECT id, booking_id AS bookingId, type, description, status, created_at AS createdAt FROM service_requests ORDER BY id DESC"
  );

  return {
    users,
    rooms: rooms.map((room) => ({ ...room, amenities: typeof room.amenities === "string" ? JSON.parse(room.amenities) : room.amenities })),
    menu,
    bookings,
    requests: requests.map((request) => ({ ...request, createdAt: new Date(request.createdAt).toISOString() }))
  };
}

async function writeMysqlState(state) {
  const pool = await getMysqlPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM service_requests");
    await connection.query("DELETE FROM bookings");
    await connection.query("DELETE FROM menu_items");
    await connection.query("DELETE FROM rooms");
    await connection.query("DELETE FROM users");

    for (const user of state.users) {
      await connection.query(
        "INSERT INTO users (id, name, username, password, role) VALUES (?, ?, ?, ?, ?)",
        [user.id, user.name, user.username, user.password, user.role]
      );
    }

    for (const room of state.rooms) {
      await connection.query(
        "INSERT INTO rooms (id, room_number, type, price, amenities, photo) VALUES (?, ?, ?, ?, ?, ?)",
        [room.id, room.number, room.type, room.price, JSON.stringify(room.amenities), room.photo]
      );
    }

    for (const item of state.menu || []) {
      await connection.query(
        "INSERT INTO menu_items (id, name, description, price, available) VALUES (?, ?, ?, ?, ?)",
        [item.id, item.name, item.description, item.price, item.available ? 1 : 0]
      );
    }

    for (const booking of state.bookings) {
      await connection.query(
        "INSERT INTO bookings (id, user_id, guest, room_id, check_in, check_out, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [booking.id, booking.userId, booking.guest, booking.roomId, booking.checkIn, booking.checkOut, booking.status]
      );
    }

    for (const request of state.requests) {
      await connection.query(
        "INSERT INTO service_requests (id, booking_id, type, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [request.id, request.bookingId, request.type, request.description, request.status, new Date(request.createdAt)]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function readState() {
  if (USE_MYSQL) return readMysqlState();

  if (!fs.existsSync(DATA_FILE)) {
    await writeState(clone(demoState));
  }

  try {
    const loaded = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (!Array.isArray(loaded.menu)) {
      loaded.menu = clone(demoState.menu);
    }
    return loaded;
  } catch {
    const state = clone(demoState);
    await writeState(state);
    return state;
  }
}

async function writeState(state) {
  if (USE_MYSQL) {
    await writeMysqlState(state);
    return;
  }

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function signToken(user) {
  const payload = Buffer.from(JSON.stringify({ userId: user.id, role: user.role })).toString("base64url");
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyToken(token, state) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return state.users.find((user) => user.id === session.userId && user.role === session.role) || null;
  } catch {
    return null;
  }
}

function getAuthUser(req, state) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return verifyToken(token, state);
}

function requireRole(req, res, state, role) {
  const user = getAuthUser(req, state);
  if (!user) {
    sendError(res, 401, "Authentication required.");
    return null;
  }

  if (user.role !== role) {
    sendError(res, 403, `${role} access required.`);
    return null;
  }

  return user;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function datesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function isRoomAvailable(state, roomId, checkIn, checkOut) {
  return !state.bookings.some((booking) => {
    return booking.roomId === roomId && booking.status !== "cancelled" && datesOverlap(checkIn, checkOut, booking.checkIn, booking.checkOut);
  });
}

function routeStatic(req, res, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  let filePath = path.resolve(ROOT_DIR, `.${requestedPath}`);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

async function routeApi(req, res, pathname) {
  const state = await readState();

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "hotel-portal-backend" });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await parseBody(req);
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = state.users.find((item) => item.username.toLowerCase() === username && item.password === password);

    if (!user) {
      sendError(res, 401, "Invalid username or password.");
      return;
    }

    sendJson(res, 200, { user: publicUser(user), token: signToken(user) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/register") {
    const body = await parseBody(req);
    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!name || !username || password.length < 4) {
      sendError(res, 400, "Name, username, and a four-character password are required.");
      return;
    }

    if (state.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      sendError(res, 409, "That username is already taken.");
      return;
    }

    const user = { id: Date.now(), name, username, password, role: "guest" };
    state.users.push(user);
    await writeState(state);
    sendJson(res, 201, { user: publicUser(user), token: signToken(user) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/rooms") {
    sendJson(res, 200, { rooms: state.rooms });
    return;
  }

  if (req.method === "GET" && pathname === "/api/menu") {
    if (!Array.isArray(state.menu)) state.menu = [];
    sendJson(res, 200, { menu: state.menu });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/menu") {
    const user = requireRole(req, res, state, "admin");
    if (!user) return;

    const body = await parseBody(req);
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const price = Number(body.price);
    const available = Boolean(body.available !== false);

    if (!name || !description || Number.isNaN(price) || price < 0) {
      sendError(res, 400, "Name, description, and valid price are required.");
      return;
    }

    state.menu = Array.isArray(state.menu) ? state.menu : [];
    const item = { id: Date.now(), name, description, price, available };
    state.menu.unshift(item);
    await writeState(state);
    sendJson(res, 201, { item });
    return;
  }

  const menuMatch = pathname.match(/^\/api\/admin\/menu\/(\d+)$/);
  if (menuMatch && req.method === "PATCH") {
    const user = requireRole(req, res, state, "admin");
    if (!user) return;

    const item = (state.menu || []).find((entry) => entry.id === Number(menuMatch[1]));
    if (!item) {
      sendError(res, 404, "Menu item not found.");
      return;
    }

    const body = await parseBody(req);
    if (body.name !== undefined) item.name = String(body.name || "").trim();
    if (body.description !== undefined) item.description = String(body.description || "").trim();
    if (body.price !== undefined) item.price = Number(body.price);
    if (body.available !== undefined) item.available = Boolean(body.available);

    if (!item.name || !item.description || Number.isNaN(item.price) || item.price < 0) {
      sendError(res, 400, "Name, description, and valid price are required.");
      return;
    }

    await writeState(state);
    sendJson(res, 200, { item });
    return;
  }

  if (menuMatch && req.method === "DELETE") {
    const user = requireRole(req, res, state, "admin");
    if (!user) return;

    const index = (state.menu || []).findIndex((entry) => entry.id === Number(menuMatch[1]));
    if (index === -1) {
      sendError(res, 404, "Menu item not found.");
      return;
    }

    state.menu.splice(index, 1);
    await writeState(state);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "DELETE" && pathname === "/api/admin/menu/unavailable") {
    const user = requireRole(req, res, state, "admin");
    if (!user) return;

    state.menu = (state.menu || []).filter((entry) => entry.available);
    await writeState(state);
    sendJson(res, 200, { ok: true, menu: state.menu });
    return;
  }

  if (req.method === "GET" && pathname === "/api/bookings/my") {
    const user = requireRole(req, res, state, "guest");
    if (!user) return;
    sendJson(res, 200, { bookings: state.bookings.filter((booking) => booking.userId === user.id) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/requests/my") {
    const user = requireRole(req, res, state, "guest");
    if (!user) return;
    const userBookingIds = new Set(state.bookings.filter((booking) => booking.userId === user.id).map((booking) => booking.id));
    const requests = state.requests.filter((request) => userBookingIds.has(request.bookingId));
    sendJson(res, 200, { requests });
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/requests/")) {
    const user = requireRole(req, res, state, "guest");
    if (!user) return;

    const requestId = Number(pathname.split("/").pop());
    const request = state.requests.find((item) => item.id === requestId);
    if (!request) {
      sendError(res, 404, "Request not found.");
      return;
    }

    const booking = state.bookings.find((bookingItem) => bookingItem.id === request.bookingId && bookingItem.userId === user.id);
    if (!booking) {
      sendError(res, 403, "Cannot cancel a request for another guest.");
      return;
    }

    if (request.status !== "new") {
      sendError(res, 400, "Only new requests can be canceled.");
      return;
    }

    state.requests = state.requests.filter((item) => item.id !== requestId);
    await writeState(state);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/bookings") {
    const user = requireRole(req, res, state, "guest");
    if (!user) return;

    const body = await parseBody(req);
    const roomId = Number(body.roomId);
    const checkIn = String(body.checkIn || "");
    const checkOut = String(body.checkOut || "");

    if (!state.rooms.some((room) => room.id === roomId) || !checkIn || !checkOut || checkIn >= checkOut) {
      sendError(res, 400, "Valid room and date range are required.");
      return;
    }

    if (!isRoomAvailable(state, roomId, checkIn, checkOut)) {
      sendError(res, 409, "Room is not available for those dates.");
      return;
    }

    const booking = { id: Date.now(), userId: user.id, guest: user.name, roomId, checkIn, checkOut, status: "confirmed" };
    state.bookings.unshift(booking);
    await writeState(state);
    sendJson(res, 201, { booking });
    return;
  }

  if (req.method === "POST" && pathname === "/api/requests") {
    const user = requireRole(req, res, state, "guest");
    if (!user) return;

    const body = await parseBody(req);
    const bookingId = Number(body.bookingId);
    const booking = state.bookings.find((item) => item.id === bookingId && item.userId === user.id);

    if (!booking) {
      sendError(res, 404, "Guest booking not found.");
      return;
    }

    const request = {
      id: Date.now(),
      bookingId,
      type: String(body.type || "maintenance"),
      description: String(body.description || "").trim(),
      status: "new",
      createdAt: new Date().toISOString()
    };

    if (!request.description) {
      sendError(res, 400, "Request description is required.");
      return;
    }

    state.requests.unshift(request);
    await writeState(state);
    sendJson(res, 201, { request });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/bookings") {
    const user = requireRole(req, res, state, "admin");
    if (!user) return;
    sendJson(res, 200, { bookings: state.bookings });
    return;
  }

  const bookingMatch = pathname.match(/^\/api\/admin\/bookings\/(\d+)$/);
  if (bookingMatch && req.method === "PATCH") {
    const user = requireRole(req, res, state, "admin");
    if (!user) return;

    const booking = state.bookings.find((entry) => entry.id === Number(bookingMatch[1]));
    if (!booking) {
      sendError(res, 404, "Booking not found.");
      return;
    }

    const body = await parseBody(req);
    const status = String(body.status || "");
    if (!["confirmed", "cancelled"].includes(status)) {
      sendError(res, 400, "Invalid booking status.");
      return;
    }

    booking.status = status;
    await writeState(state);
    sendJson(res, 200, { booking });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/requests") {
    const user = requireRole(req, res, state, "admin");
    if (!user) return;
    sendJson(res, 200, { requests: state.requests });
    return;
  }

  const statusMatch = pathname.match(/^\/api\/admin\/requests\/(\d+)\/status$/);
  if (req.method === "PATCH" && statusMatch) {
    const user = requireRole(req, res, state, "admin");
    if (!user) return;

    const body = await parseBody(req);
    const requestId = Number(statusMatch[1]);
    const status = String(body.status || "");
    const request = state.requests.find((item) => item.id === requestId);

    if (!request) {
      sendError(res, 404, "Request not found.");
      return;
    }

    if (!["new", "in_progress", "completed"].includes(status)) {
      sendError(res, 400, "Invalid request status.");
      return;
    }

    if (status === "completed") {
      state.requests = state.requests.filter((item) => item.id !== requestId);
      await writeState(state);
      sendJson(res, 200, { ok: true });
      return;
    }

    request.status = status;
    await writeState(state);
    sendJson(res, 200, { request });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/reset") {
    const user = requireRole(req, res, state, "admin");
    if (!user) return;
    const freshState = clone(demoState);
    await writeState(freshState);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendError(res, 404, "API route not found.");
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (pathname.startsWith("/api/")) {
      await routeApi(req, res, pathname);
      return;
    }

    routeStatic(req, res, pathname);
  } catch (error) {
    sendError(res, 500, error.message || "Server error.");
  }
});

server.listen(PORT, () => {
  console.log(`Hotel portal backend running at http://localhost:${PORT}/`);
  console.log(`Storage: ${USE_MYSQL ? "MySQL" : "JSON file"}`);
  console.log(`Admin portal: http://localhost:${PORT}/admin/`);
  console.log(`Guest portal: http://localhost:${PORT}/guest/`);
});
