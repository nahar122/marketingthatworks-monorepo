import * as dotenv from "dotenv";
dotenv.config();

if (!process.env.MONGO_URI) {
  throw Error("Cannot find 'MONGO_URI' environment variable.");
}
if (!process.env.EMBEDDING_SERVICE_BASE_URL) {
  throw Error("Cannot find 'EMBEDDING_SERVICE_BASE_URL' environment variable.");
}
if (!process.env.GMB_ACCOUNT_ID) {
  throw Error("Cannot find 'GMB_ACCOUNT_ID' environment variable.");
}

export const config = {
  MONGO_URI: process.env.MONGO_URI,
  PORT: process.env.PORT,
  EMBEDDING_SERVICE_BASE_URL: process.env.EMBEDDING_SERVICE_BASE_URL,
  GMB_ACCOUNT_ID: process.env.GMB_ACCOUNT_ID,
  MONGO_DB_NAME: process.env.MONGO_DB_NAME,
};

console.log("CONFIG: ", config);
