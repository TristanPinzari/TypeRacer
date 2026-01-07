import { Client, ID, TablesDB } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint("https://tor.cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const tablesDB = new TablesDB(client);

  const { action, data } = req.bodyJson;
  switch (action) {
    case "addPlayerToRows":
      try {
        const client = new Client()
          .setEndpoint("https://tor.cloud.appwrite.io/v1")
          .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
          .setKey(process.env.APPWRITE_API_KEY);

        const tablesDB = new TablesDB(client);
        const playerId = ID.unique();
        const promise = await tablesDB.createRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "players",
          rowId: playerId,
          data: {
            lastSeen: Date.now(),
          },
        });

        return res.json({ status: "complete", playerId: playerId }, 200);
      } catch (err) {
        error("Error: " + err.message);
        return res.json({ error: "Failed to fetch" }, 500);
      }

    case "updateStatus":
      // You can add more cases like this later!
      log("Updating status logic goes here");
      return res.json({ status: "updated" }, 200);

    default:
      // Handle cases where the action doesn't match anything
      return res.json({ error: `Action '${action}' not recognized` }, 400);
  }
};
