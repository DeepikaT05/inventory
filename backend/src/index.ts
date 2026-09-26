import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { errorHandler, requireApiKey } from './http.js';
import { shopRouter } from './routes/shop.js';
import { itemsRouter } from './routes/items.js';
import { dealersRouter } from './routes/dealers.js';
import { arrivalsRouter } from './routes/arrivals.js';
import { customersRouter } from './routes/customers.js';
import { billsRouter } from './routes/bills.js';
import { dashboardRouter } from './routes/dashboard.js';
import { reportsRouter } from './routes/reports.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { sethRouter } from './routes/seth.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => { res.json({ ok: true }); });

// Public admin routes (login handled inside with its own JWT check)
app.use('/admin', adminRouter);
app.use('/auth', authRouter);

// Existing store API routes
const api = express.Router();
api.use(requireApiKey);
api.use('/shop', shopRouter);
api.use('/items', itemsRouter);
api.use('/dealers', dealersRouter);
api.use('/arrivals', arrivalsRouter);
api.use('/seth', sethRouter);
api.use('/customers', customersRouter);
api.use('/bills', billsRouter);
api.use('/dashboard', dashboardRouter);
api.use('/reports', reportsRouter);
app.use('/api', api);

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, '0.0.0.0', () => {
  console.log(`Mandi Ledger API on http://localhost:${port}`);
});

