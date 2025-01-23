import * as dotenv from "dotenv";
dotenv.config();

if (!process.env.MONGO_URI) {
  throw Error("Cannot find 'MONGO_URI' environment variable.");
}

if (!process.env.REDIS_HOST) {
  throw Error("Cannot find 'REDIS_HOST' environment variable.");
}
if (!process.env.REDIS_PORT) {
  throw Error("Cannot find 'REDIS_PORT' environment variable.");
}
if (!process.env.EMBEDDING_SERVICE_BASE_URL) {
  throw Error("Cannot find 'EMBEDDING_SERVICE_BASE_URL' environment variable.");
}

export const config = {
  MONGO_URI: process.env.MONGO_URI,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: parseInt(process.env.REDIS_PORT),
  PORT: process.env.PORT,
  EMBEDDING_SERVICE_BASE_URL: process.env.EMBEDDING_SERVICE_BASE_URL,
  MONGO_DB_NAME: process.env.MONGO_DB_NAME,
};

console.log("CONFIG: ", config);
