CREATE DATABASE IF NOT EXISTS hotel_portal;
USE hotel_portal;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  password VARCHAR(120) NOT NULL,
  role ENUM('guest', 'admin') NOT NULL DEFAULT 'guest'
);

CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT PRIMARY KEY,
  room_number VARCHAR(20) NOT NULL UNIQUE,
  type VARCHAR(120) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  amenities JSON NOT NULL,
  photo TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  guest VARCHAR(120) NOT NULL,
  room_id BIGINT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_requests (
  id BIGINT PRIMARY KEY,
  booking_id BIGINT NOT NULL,
  type ENUM('maintenance', 'cleaning', 'food_order') NOT NULL,
  description TEXT NOT NULL,
  status ENUM('new', 'in_progress', 'completed') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_requests_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS menu_items (
  id BIGINT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  available TINYINT(1) NOT NULL DEFAULT 1
);

INSERT INTO users (id, name, username, password, role) VALUES
  (1, 'SHAIK.ISMAIL', 'ISMAIL', 'ismail123', 'admin'),
  (2, 'N.VYSHNAVI LAKSHMI', 'VYSHNAVI', 'vyshu123', 'admin'),
  (3, 'D.NAGA SURYA', 'NAGASURYA', 'surya123', 'admin'),
  (4, 'CH.THANUDEEP', 'THANUDEEP', 'thanu123', 'admin')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password = VALUES(password),
  role = VALUES(role);

INSERT INTO rooms (id, room_number, type, price, amenities, photo) VALUES
  (1, '204', 'City King', 148, JSON_ARRAY('King bed', 'Desk', 'City view'), 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80'),
  (2, '318', 'Garden Double', 176, JSON_ARRAY('Two queens', 'Balcony', 'Breakfast'), 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80'),
  (3, '412', 'Executive Suite', 264, JSON_ARRAY('Lounge', 'Tub', 'Late checkout'), 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=900&q=80'),
  (4, '506', 'Harbor Suite', 318, JSON_ARRAY('Sea view', 'Mini bar', 'Butler call'), 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80'),
  (5, '611', 'Family Loft', 232, JSON_ARRAY('Sleeps four', 'Kitchenette', 'Sofa bed'), 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80'),
  (6, '720', 'Penthouse', 480, JSON_ARRAY('Terrace', 'Dining room', 'Priority service'), 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80')
ON DUPLICATE KEY UPDATE
  type = VALUES(type),
  price = VALUES(price),
  amenities = VALUES(amenities),
  photo = VALUES(photo);

INSERT INTO bookings (id, user_id, guest, room_id, check_in, check_out, status) VALUES
  (101, 1, 'Maya Patel', 3, '2026-06-22', '2026-06-25', 'confirmed'),
  (102, 1, 'Jordan Lee', 1, '2026-06-24', '2026-06-27', 'confirmed')
ON DUPLICATE KEY UPDATE
  status = VALUES(status);

INSERT INTO service_requests (id, booking_id, type, description, status, created_at) VALUES
  (201, 101, 'food_order', 'Paneer tikka, lime soda, and two plates.', 'new', '2026-06-22 09:20:00'),
  (202, 102, 'maintenance', 'Air conditioner is cooling slowly.', 'in_progress', '2026-06-22 10:05:00')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  description = VALUES(description);
