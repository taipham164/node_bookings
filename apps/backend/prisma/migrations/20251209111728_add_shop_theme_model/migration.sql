-- CreateTable
CREATE TABLE "shop_themes" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "brandName" TEXT,
    "tagline" TEXT,
    "primaryColor" TEXT,
    "accentColor" TEXT,
    "background" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_themes_shopId_key" ON "shop_themes"("shopId");
