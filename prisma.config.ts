import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Carrega .env.local (Next.js) para os comandos do Prisma CLI
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/momentum_cmv",
  },
});
