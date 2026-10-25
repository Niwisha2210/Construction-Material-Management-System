DROP DATABASE IF EXISTS buildstock;
CREATE DATABASE buildstock;
USE buildstock;

-- ---------- TABLES (8) ----------
CREATE TABLE Employees (
  emp_id INT AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(80) NOT NULL,
  role   VARCHAR(50) NOT NULL,
  phone  VARCHAR(15)
);

CREATE TABLE Suppliers (
  supplier_id INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  email VARCHAR(100),
  city  VARCHAR(50)
);

CREATE TABLE Materials (
  material_id   INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(80) NOT NULL UNIQUE,
  category      VARCHAR(50) NOT NULL,
  unit          VARCHAR(20) NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
  reorder_level INT NOT NULL DEFAULT 10
);

CREATE TABLE Sites (
  site_id    INT AUTO_INCREMENT PRIMARY KEY,
  site_name  VARCHAR(100) NOT NULL,
  location   VARCHAR(100),
  status     ENUM('Active','On Hold','Completed') NOT NULL DEFAULT 'Active',
  manager_id INT,
  FOREIGN KEY (manager_id) REFERENCES Employees(emp_id) ON DELETE SET NULL
);

CREATE TABLE Purchases (
  purchase_id   INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id   INT NOT NULL,
  emp_id        INT NOT NULL,
  purchase_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  total_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (supplier_id) REFERENCES Suppliers(supplier_id),
  FOREIGN KEY (emp_id)      REFERENCES Employees(emp_id)
);

CREATE TABLE Purchase_Items (
  item_id     INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  material_id INT NOT NULL,
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES Purchases(purchase_id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES Materials(material_id)
);

CREATE TABLE Inventory (
  material_id  INT PRIMARY KEY,
  quantity     INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES Materials(material_id) ON DELETE CASCADE
);

CREATE TABLE Material_Usage (
  usage_id    INT AUTO_INCREMENT PRIMARY KEY,
  site_id     INT NOT NULL,
  material_id INT NOT NULL,
  emp_id      INT NOT NULL,
  quantity    INT NOT NULL CHECK (quantity > 0),
  usage_date  DATE NOT NULL DEFAULT (CURRENT_DATE),
  FOREIGN KEY (site_id)     REFERENCES Sites(site_id),
  FOREIGN KEY (material_id) REFERENCES Materials(material_id),
  FOREIGN KEY (emp_id)      REFERENCES Employees(emp_id)
);

-- ---------- FUNCTION ----------
DELIMITER $$
CREATE FUNCTION fn_stock_status(qty INT, reorder INT) RETURNS VARCHAR(15)
DETERMINISTIC
BEGIN
  IF qty <= 0 THEN RETURN 'Out of stock';
  ELSEIF qty <= reorder THEN RETURN 'Low stock';
  END IF;
  RETURN 'In stock';
END$$
DELIMITER ;

-- ---------- VIEWS ----------
CREATE VIEW v_inventory AS
SELECT m.material_id, m.name, m.category, m.unit, m.reorder_level,
       i.quantity,
       fn_stock_status(i.quantity, m.reorder_level) AS status,
       i.quantity * m.unit_price AS stock_value
FROM Materials m JOIN Inventory i ON i.material_id = m.material_id;

CREATE VIEW v_purchase_summary AS
SELECT p.purchase_id, p.purchase_date, s.name AS supplier, e.name AS employee, p.total_amount
FROM Purchases p
JOIN Suppliers s ON s.supplier_id = p.supplier_id
JOIN Employees e ON e.emp_id = p.emp_id;

CREATE VIEW v_site_usage AS
SELECT s.site_name, m.name AS material,
       SUM(u.quantity) AS total_used,
       SUM(u.quantity * m.unit_price) AS cost
FROM Material_Usage u
JOIN Sites s     ON s.site_id = u.site_id
JOIN Materials m ON m.material_id = u.material_id
GROUP BY s.site_id, s.site_name, m.material_id, m.name;

-- ---------- TRIGGERS ----------
DELIMITER $$
CREATE TRIGGER trg_material_inventory AFTER INSERT ON Materials
FOR EACH ROW
BEGIN
  INSERT INTO Inventory (material_id, quantity) VALUES (NEW.material_id, 0);
END$$

CREATE TRIGGER trg_purchase_stock AFTER INSERT ON Purchase_Items
FOR EACH ROW
BEGIN
  UPDATE Inventory SET quantity = quantity + NEW.quantity WHERE material_id = NEW.material_id;
  UPDATE Purchases SET total_amount = total_amount + NEW.quantity * NEW.unit_price
  WHERE purchase_id = NEW.purchase_id;
END$$

CREATE TRIGGER trg_usage_check BEFORE INSERT ON Material_Usage
FOR EACH ROW
BEGIN
  IF (SELECT quantity FROM Inventory WHERE material_id = NEW.material_id) < NEW.quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock for this material';
  END IF;
END$$

CREATE TRIGGER trg_usage_stock AFTER INSERT ON Material_Usage
FOR EACH ROW
BEGIN
  UPDATE Inventory SET quantity = quantity - NEW.quantity WHERE material_id = NEW.material_id;
END$$
DELIMITER ;

-- ---------- STORED PROCEDURE (with transaction) ----------
DELIMITER $$
CREATE PROCEDURE sp_record_usage(IN p_site INT, IN p_material INT, IN p_emp INT, IN p_qty INT)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  START TRANSACTION;
  INSERT INTO Material_Usage (site_id, material_id, emp_id, quantity)
  VALUES (p_site, p_material, p_emp, p_qty);
  COMMIT;
END$$
DELIMITER ;

-- ---------- SAMPLE DATA ----------
INSERT INTO Employees (name, role, phone) VALUES
 ('Ravi Kumar',   'Store Manager',    '9840011111'),
 ('Anita Joseph', 'Site Engineer',    '9840022222'),
 ('Suresh Babu',  'Site Supervisor',  '9840033333'),
 ('Meena R',      'Purchase Officer', '9840044444');

INSERT INTO Suppliers (name, phone, email, city) VALUES
 ('Sri Ganesh Traders',   '9442011111', 'ganesh@example.com', 'Coimbatore'),
 ('Southern Steel Works', '9442022222', 'steel@example.com',  'Chennai'),
 ('Annai Bricks',         '9442033333', 'annai@example.com',  'Nagercoil'),
 ('Kovai Hardware Mart',  '9442044444', 'kovai@example.com',  'Coimbatore');

INSERT INTO Materials (name, category, unit, unit_price, reorder_level) VALUES
 ('Cement (50 kg)', 'Binding',   'bag',     420.00,  50),
 ('Steel Rods',     'Steel',     'unit',     65.00,  20),
 ('Bricks',         'Masonry',   'piece',     8.00, 500),
 ('River Sand',     'Aggregate', 'ton',    1800.00,  10),
 ('Gravel',         'Aggregate', 'ton',    1400.00,  10),
 ('Wall Paint',     'Finishing', 'bucket', 2200.00,   5),
 ('PVC Pipes',      'Plumbing',  'piece',   350.00,  20);

INSERT INTO Sites (site_name, location, status, manager_id) VALUES
 ('Green Valley Apartments', 'Coimbatore', 'Active',    2),
 ('City Mall Annex',         'Peelamedu',  'Active',    3),
 ('Riverside Villas',        'Neyyoor',    'On Hold',   2),
 ('Municipal School Block',  'Thuckalay',  'Completed', 3);

-- totals are filled automatically by trg_purchase_stock
INSERT INTO Purchases (supplier_id, emp_id, purchase_date) VALUES
 (1, 4, '2026-10-01'), (2, 4, '2026-10-05'), (4, 1, '2026-10-12');

INSERT INTO Purchase_Items (purchase_id, material_id, quantity, unit_price) VALUES
 (1, 1, 300, 410.00), (1, 3, 5000, 8.00),
 (2, 2, 100, 62.00),  (2, 4, 40, 1750.00), (2, 5, 30, 1400.00),
 (3, 6, 20, 2100.00), (3, 7, 60, 340.00),  (3, 1, 100, 415.00);

CALL sp_record_usage(1, 1, 2, 100);
CALL sp_record_usage(1, 2, 2, 95);
CALL sp_record_usage(2, 3, 3, 1200);
CALL sp_record_usage(2, 4, 3, 35);
CALL sp_record_usage(1, 6, 2, 18);