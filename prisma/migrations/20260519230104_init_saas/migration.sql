-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tree" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tree_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "treeId" TEXT,
    CONSTRAINT "Media_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Media_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Media" ("createdAt", "date", "description", "id", "personId", "title", "type", "updatedAt", "url") SELECT "createdAt", "date", "description", "id", "personId", "title", "type", "updatedAt", "url" FROM "Media";
DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
CREATE TABLE "new_Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthName" TEXT,
    "gender" TEXT NOT NULL,
    "birthDate" TEXT,
    "birthPlace" TEXT,
    "baptismDate" TEXT,
    "baptismPlace" TEXT,
    "deathDate" TEXT,
    "deathPlace" TEXT,
    "burialDate" TEXT,
    "burialPlace" TEXT,
    "occupation" TEXT,
    "notes" TEXT,
    "avatarUrl" TEXT,
    "sources" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "treeId" TEXT,
    "fatherId" TEXT,
    "motherId" TEXT,
    CONSTRAINT "Person_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Person_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Person_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Person" ("avatarUrl", "baptismDate", "baptismPlace", "birthDate", "birthName", "birthPlace", "burialDate", "burialPlace", "createdAt", "deathDate", "deathPlace", "fatherId", "firstName", "gender", "id", "lastName", "motherId", "notes", "occupation", "sources", "updatedAt") SELECT "avatarUrl", "baptismDate", "baptismPlace", "birthDate", "birthName", "birthPlace", "burialDate", "burialPlace", "createdAt", "deathDate", "deathPlace", "fatherId", "firstName", "gender", "id", "lastName", "motherId", "notes", "occupation", "sources", "updatedAt" FROM "Person";
DROP TABLE "Person";
ALTER TABLE "new_Person" RENAME TO "Person";
CREATE TABLE "new_Union" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partner1Id" TEXT NOT NULL,
    "partner2Id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weddingDate" TEXT,
    "weddingPlace" TEXT,
    "divorceDate" TEXT,
    "isDivorced" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "treeId" TEXT,
    CONSTRAINT "Union_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Union_partner1Id_fkey" FOREIGN KEY ("partner1Id") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Union_partner2Id_fkey" FOREIGN KEY ("partner2Id") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Union" ("createdAt", "divorceDate", "id", "isDivorced", "notes", "partner1Id", "partner2Id", "type", "updatedAt", "weddingDate", "weddingPlace") SELECT "createdAt", "divorceDate", "id", "isDivorced", "notes", "partner1Id", "partner2Id", "type", "updatedAt", "weddingDate", "weddingPlace" FROM "Union";
DROP TABLE "Union";
ALTER TABLE "new_Union" RENAME TO "Union";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
