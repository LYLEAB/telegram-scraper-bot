# Tracking Pricing BOT Dashboard

The **Tracking Pricing BOT** is a comprehensive internal tool designed to track market prices and competitor pricing across various regions, channels, and retail/wholesale environments. It combines a Telegram Bot for on-the-ground data collection with a robust Next.js Dashboard for visualization, analysis, and data export.

## 🚀 Features

- **Real-Time Data Collection**: Field staff can submit pricing data, location details, and photos directly via a Telegram Bot.
- **Interactive Dashboard**: A powerful Next.js web interface to view, filter, and analyze submissions.
- **Advanced Filtering**: Filter pricing data by Date, Category, Brand, SKU, Province, Channel, and Price Source (NCP/ORD).
- **Automated Price Anomaly Detection**: Highlights abnormally high or low prices based on standard deviation analysis.
- **Dynamic Pricing Calculation**: Automatically calculates Net Pricing from basic prices, schemes, and FOC (Free of Charge) promotions.
- **Data Export**: Export filtered tracking data into cleanly formatted Excel (XLSX) or PDF reports that mirror the standard master file format.
- **Geospatial Mapping**: View pricing submissions visually mapped across regions using Leaflet Maps.

## 🛠 Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), React, Tailwind CSS, Recharts (for analytics).
- **Backend**: Supabase (PostgreSQL) for secure database storage and real-time syncing.
- **Bot/Service Layer**: Python backend (Telegram Bot API) handling incoming submissions and storing them into Supabase.
- **Map & Export Tools**: React-Leaflet for mapping, jspdf & xlsx for data export.

## ⚙️ Getting Started

First, ensure you have your `.env.local` file configured with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application. The main admin interface is located at `/admin`.

## 📚 Configuration & Administration

For detailed instructions on how to add new Brands, Categories, Provinces, or how to configure the internal UI logic, please refer to the [CONFIGURATION.md](./CONFIGURATION.md) guide.

## 🤝 Contribution

This tool is designed specifically for internal market analysis workflows. When contributing or modifying the project, ensure that the data mapping aligns with the senior master file formats (as documented in `ExportModal.tsx` and the `CONFIGURATION.md`).
