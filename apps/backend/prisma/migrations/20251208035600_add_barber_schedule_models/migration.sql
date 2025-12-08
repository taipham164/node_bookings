-- CreateTable
CREATE TABLE "barber_working_hours" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barber_working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barber_time_off" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barber_time_off_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "barber_working_hours_shopId_barberId_dayOfWeek_idx" ON "barber_working_hours"("shopId", "barberId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "barber_time_off_shopId_barberId_startAt_endAt_idx" ON "barber_time_off"("shopId", "barberId", "startAt", "endAt");
