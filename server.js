import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from './models/index.js';
import productRoutes from './routes/products.js';
import deliveryOptionRoutes from './routes/deliveryOptions.js';
import cartItemRoutes from './routes/cartItems.js';
import orderRoutes from './routes/orders.js';
import resetRoutes from './routes/reset.js';
import paymentSummaryRoutes from './routes/paymentSummary.js';
import { Product } from './models/Product.js';
import { DeliveryOption } from './models/DeliveryOption.js';
import { CartItem } from './models/CartItem.js';
import { Order } from './models/Order.js';
import { defaultProducts } from './defaultData/defaultProducts.js';
import { defaultDeliveryOptions } from './defaultData/defaultDeliveryOptions.js';
import { defaultCart } from './defaultData/defaultCart.js';
import { defaultOrders } from './defaultData/defaultOrders.js';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Serve images from the images folder
app.use('/images', express.static(path.join(__dirname, 'images')));

// 1. Root route specifically for Render Health Checks & Browser visits
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'E-Commerce Backend API is active'
  });
});

// Use API routes
app.use('/api/products', productRoutes);
app.use('/api/delivery-options', deliveryOptionRoutes);
app.use('/api/cart-items', cartItemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reset', resetRoutes);
app.use('/api/payment-summary', paymentSummaryRoutes);

// Serve static files from the dist folder if present
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route to serve index.html for unmatched non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Endpoint or page not found' });
  }
});

// Error handling middleware
/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
/* eslint-enable no-unused-vars */

// 2. Start Express immediately on Render's allocated PORT
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    await sequelize.sync();
    console.log('Database synced successfully.');

    const productCount = await Product.count();
    if (productCount === 0) {
      const timestamp = Date.now();

      const productsWithTimestamps = defaultProducts.map((product, index) => ({
        ...product,
        createdAt: new Date(timestamp + index),
        updatedAt: new Date(timestamp + index)
      }));

      const deliveryOptionsWithTimestamps = defaultDeliveryOptions.map((option, index) => ({
        ...option,
        createdAt: new Date(timestamp + index),
        updatedAt: new Date(timestamp + index)
      }));

      const cartItemsWithTimestamps = defaultCart.map((item, index) => ({
        ...item,
        createdAt: new Date(timestamp + index),
        updatedAt: new Date(timestamp + index)
      }));

      const ordersWithTimestamps = defaultOrders.map((order, index) => ({
        ...order,
        createdAt: new Date(timestamp + index),
        updatedAt: new Date(timestamp + index)
      }));

      await Product.bulkCreate(productsWithTimestamps);
      await DeliveryOption.bulkCreate(deliveryOptionsWithTimestamps);
      await CartItem.bulkCreate(cartItemsWithTimestamps);
      await Order.bulkCreate(ordersWithTimestamps);

      console.log('Default data added to the database.');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
});