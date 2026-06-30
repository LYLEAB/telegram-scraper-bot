# Configuration Guide: Tracking Pricing BOT

This guide details how to configure, update, and manage various properties in the Tracking Pricing BOT dashboard, such as adding new brands, modifying filters, and adapting the export format.

## Table of Contents
1. [Adding New Brands and SKUs](#1-adding-new-brands-and-skus)
2. [Adding New Categories or Channels](#2-adding-new-categories-or-channels)
3. [Modifying the Export Logic](#3-modifying-the-export-logic)
4. [Updating the Telegram Bot Data Structure](#4-updating-the-telegram-bot-data-structure)
5. [Connecting to the Database](#5-connecting-to-the-database)

---

### 1. Adding New Brands and SKUs

Brands and SKUs are largely derived from the data sent by the Telegram Bot. In the database, the string usually combines both the brand name and the SKU size (e.g., `"Angkor Sky Can 330ml"`).

**Dashboard Parsing Logic:**
In the Dashboard (specifically inside `src/app/admin/submissions/SubmissionsClient.tsx` and `ExportModal.tsx`), we use a helper function to automatically split this combined string into a **Brand** and a **SKU**.

```typescript
const parseBrandAndSku = (fullBrandLabel: string) => {
  if (!fullBrandLabel) return { shortBrand: '—', sku: '—' };
  const parts = fullBrandLabel.trim().split(' ');
  // Assuming the last two words define the packaging/SKU (e.g., "Can 330ml")
  if (parts.length >= 3) {
    return {
      shortBrand: parts.slice(0, -2).join(' '),
      sku: parts.slice(-2).join(' ')
    };
  }
  return { shortBrand: fullBrandLabel, sku: '—' };
};
```

**How to add a new Brand/SKU:**
1. You do **not** need to manually add them to a hardcoded list in the frontend. The dashboard dynamically extracts available brands by reading the `brand_label` column in the Supabase database.
2. If your field staff submit a new product via the Telegram Bot (e.g., `New Cola PET 500ml`), the dashboard will automatically parse it as:
   - Brand: `New Cola`
   - SKU: `PET 500ml`
3. It will immediately show up in the multi-select filter dropdowns.

> [!NOTE]
> Ensure that the Telegram Bot always formats the product label with the packaging and size at the end (e.g., `[Brand Name] [Packaging Type] [Size]`). If a product name doesn't follow this structure, the parsing logic above will treat the entire string as the brand.

---

### 2. Adding New Categories or Channels

Similar to Brands, **Categories** and **Channels** are dynamically extracted from the `category_label` and `channel_label` columns in the database.

**To add a new Category/Channel:**
1. Update your Telegram Bot code (Python) to include the new Category or Channel in its user selection menus.
2. Once the Telegram Bot starts saving this new category/channel to Supabase, it will automatically appear in the Dashboard's filter dropdown menus.

If you ever need to hardcode a fallback or map specific names, you can adjust the filtering mappings inside `SubmissionsClient.tsx`.

---

### 3. Modifying the Export Logic

When exporting to Excel or PDF, the columns must match the senior management's master file template.

**Where to edit:**
Modify `src/app/admin/submissions/ExportModal.tsx`.

**Adding a new column:**
1. Add the column title to the `AVAILABLE_COLUMNS` array:
   ```typescript
   const AVAILABLE_COLUMNS = [
     // ... existing columns
     { id: 'new_column_id', label: 'New Column Title' }
   ];
   ```
2. Scroll down to the `switch (col.id)` block inside the `exportToExcel` and `exportToPDF` functions to map the data correctly:
   ```typescript
   case 'new_column_id': 
       rowData.push(sub.your_database_field || 'N/A'); 
       break;
   ```

**Net Price Calculation Logic:**
If `net_price` is blank in the database, the Export script and the Dashboard both dynamically calculate it using the `basic_price`, `scheme`, and `foc`:
`Net Price = (Basic Price * Scheme) / (Scheme + FOC)`

---

### 4. Updating the Telegram Bot Data Structure

The Python service (`/python_service`) handles incoming Telegram messages.

- **Supabase Integration:** The bot uses the Supabase Python Client to insert rows into the `submissions` table.
- **Adding Fields:** If you want to track a new piece of data (e.g., "Discount Amount"), you must:
  1. Add a new column to the `submissions` table in the Supabase Dashboard.
  2. Update the Python bot logic to capture this data from the user and insert it into the new column.
  3. Update `SubmissionsClient.tsx` to display the new column on the Next.js dashboard.

---

### 5. Connecting to the Database

The project connects to Supabase using environment variables.

1. Locate the `.env.local` file at the root of the project.
2. It should contain your secure keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. To alter database permissions, edit your Row Level Security (RLS) policies directly within the Supabase SQL Editor.
