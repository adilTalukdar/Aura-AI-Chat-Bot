import { TestOrder } from '../types';

const TEST_ORDERS: TestOrder[] = [
  {
    id: 'ORD-101',
    customer: 'Priya Sharma',
    product: 'Vitamin C Serum (30ml)',
    value: '₹699',
    status: 'Out for Delivery',
    notes: 'BlueDart — BD-982103. Expected by 6 PM today',
  },
  {
    id: 'ORD-102',
    customer: 'Rahul Verma',
    product: 'Hydrating Sunscreen SPF 50',
    value: '₹499',
    status: 'Delivered',
    notes: 'Delhivery — DL-441029. Delivered 14 days ago',
  },
  {
    id: 'ORD-103',
    customer: 'Ananya Patel',
    product: 'Green Tea Face Wash + Toner',
    value: '₹850',
    status: 'Processing',
    notes: 'Ordered 3 hours ago. Eligible for cancellation',
  },
];

const STATUS_COLORS: Record<string, string> = {
  'Out for Delivery': 'status--delivery',
  'Delivered':        'status--delivered',
  'Processing':       'status--processing',
  'Cancelled':        'status--cancelled',
};

export function TestOrdersHelper() {
  return (
    <aside className="test-orders-panel">
      <div className="panel-header">
        <span className="panel-header-icon">🧪</span>
        <div>
          <h3 className="panel-title">Test Orders</h3>
          <p className="panel-subtitle">Use these order IDs to test the agent</p>
        </div>
      </div>

      <div className="orders-list">
        {TEST_ORDERS.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-card-top">
              <span className="order-id">{order.id}</span>
              <span className={`order-status ${STATUS_COLORS[order.status] ?? ''}`}>
                {order.status}
              </span>
            </div>
            <p className="order-customer">{order.customer}</p>
            <p className="order-product">{order.product}</p>
            <div className="order-card-bottom">
              <span className="order-value">{order.value}</span>
              <span className="order-notes">{order.notes}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="orders-hint">
        <span className="hint-icon">💡</span>
        <span>Try asking: <em>"Where is my order ORD-101?"</em></span>
      </div>
    </aside>
  );
}
