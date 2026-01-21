import { Client, TablesDB, Query } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  // Initialization
  const client = new Client()
    .setEndpoint("https://tor.cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const tablesDB = new TablesDB(client);
  const tablesToClean = ["races", "players"];
  const offset = 24 * 60 * 60 * 1000;
  const date = new Date();
  date.setTime(date.getTime() - offset);

  for (const tableId of tablesToClean) {
    tablesDB.deleteRows({
      databaseId: process.env.APPWRITE_DATABASE_ID,
      tableId: tableId,
      queries: [Query.lessThanEqual("$createdAt", date)],
    });
  }

  return res.empty();
};
