import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: "postgresql://neondb_owner:npg_XRx5darZ3jDK@ep-blue-art-b4ql26jh-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  },
});