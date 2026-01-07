import { Client, Query, TablesDB } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint("https://tor.cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const tablesDB = new TablesDB(client);

  try {
    const initialView = await tablesDB.listRows({
      databaseId: process.env.APPWRITE_DATABASE_ID,
      tableId: "texts",
      queries: [Query.limit(1)],
    });

    const total = initialView.total;

    if (total === 0) {
      return res.json({ error: "Database is empty" }, 404);
    }

    const randomOffset = Math.floor(Math.random() * total);

    const result = await tablesDB.listRows({
      databaseId: process.env.APPWRITE_DATABASE_ID,
      tableId: "texts",
      queries: [Query.limit(1), Query.offset(randomOffset)],
    });

    const pickedDoc = result.rows[0];

    return res.json({
      content: pickedDoc.content,
      origin: pickedDoc.origin,
      author: pickedDoc.author,
      type: pickedDoc.type,
      uploader: pickedDoc.uploader,
    });
  } catch (err) {
    error("Error: " + err.message);
    return res.json({ error: "Failed to fetch" }, 500);
  }
};
