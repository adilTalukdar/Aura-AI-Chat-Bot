-- Aura Skincare: Orders table + seed data
CREATE TABLE IF NOT EXISTS orders (
    id              VARCHAR(20)     PRIMARY KEY,
    customer_name   VARCHAR(100)    NOT NULL,
    product         VARCHAR(200)    NOT NULL,
    value           DECIMAL(10,2)   NOT NULL,
    status          VARCHAR(30)     NOT NULL,
    tracking_id     VARCHAR(50),
    courier         VARCHAR(50),
    notes           TEXT,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO orders (id, customer_name, product, value, status, tracking_id, courier, notes) VALUES
(
    'ORD-101',
    'Priya Sharma',
    'Vitamin C Serum (30ml)',
    699.00,
    'Out for Delivery',
    'BD-982103',
    'BlueDart',
    'BlueDart — BD-982103. Expected by 6 PM today'
),
(
    'ORD-102',
    'Rahul Verma',
    'Hydrating Sunscreen SPF 50',
    499.00,
    'Delivered',
    'DL-441029',
    'Delhivery',
    'Delhivery — DL-441029. Delivered 14 days ago'
),
(
    'ORD-103',
    'Ananya Patel',
    'Green Tea Face Wash + Toner',
    850.00,
    'Processing',
    NULL,
    NULL,
    'Ordered 3 hours ago. Eligible for cancellation'
);
