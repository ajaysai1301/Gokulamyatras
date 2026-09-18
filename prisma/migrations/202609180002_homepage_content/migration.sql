CREATE TABLE "HomepageContent" (
    "id" TEXT NOT NULL DEFAULT 'homepage',
    "draft" JSONB NOT NULL,
    "published" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HomepageContent_pkey" PRIMARY KEY ("id")
);
