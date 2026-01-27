-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "image_main" TEXT,
    "stock_count" INTEGER NOT NULL DEFAULT 0,
    "min_order" INTEGER NOT NULL DEFAULT 1,
    "in_stock" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "properties" TEXT,
    "colors" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_products" ("category_id", "colors", "created_at", "description", "id", "image_main", "in_stock", "min_order", "name", "price", "properties", "slug", "stock_count", "updated_at") SELECT "category_id", "colors", "created_at", "description", "id", "image_main", "in_stock", "min_order", "name", "price", "properties", "slug", "stock_count", "updated_at" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE INDEX "products_slug_idx" ON "products"("slug");
CREATE INDEX "products_category_id_idx" ON "products"("category_id");
CREATE INDEX "products_in_stock_idx" ON "products"("in_stock");
CREATE INDEX "products_is_active_idx" ON "products"("is_active");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
