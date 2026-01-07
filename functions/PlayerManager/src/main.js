import { Client, ID, TablesDB } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint("https://tor.cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const tablesDB = new TablesDB(client);

  function hasValidArgs(args) {
    return args.every((arg) => arg !== undefined && arg !== null);
  }

  const { action, data } = req.bodyJson;

  if (!action) {
    return res.json({ error: "Missing action" }, 400);
  }
  log(req.bodyJson);
  switch (action) {
    case "addPlayerToRows":
      try {
        const playerId = ID.unique();
        await tablesDB.createRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "players",
          rowId: playerId,
          data: {
            lastSeen: Date.now(),
          },
        });

        return res.json({ playerId: playerId }, 200);
      } catch (err) {
        error("Error: " + err.message);
        return res.json({ error: "Failed to fetch" }, 500);
      }

    case "removePlayerFromRows":
      if (!hasValidArgs([data?.playerId])) {
        return res.json({ error: "Missing parameters" }, 400);
      }

      try {
        await tablesDB.deleteRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "players",
          rowId: data.playerId,
        });

        return res.json({}, 200);
      } catch (err) {
        error("Error: " + err.message);
        return res.json({ error: "Failed to fetch" }, 500);
      }

    case "updatePlayerStatus":
      if (!hasValidArgs([data?.playerId, data?.newStatus])) {
        return res.json({ error: "Missing parameters" }, 400);
      }

      try {
        await tablesDB.updateRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "players",
          rowId: data.playerId,
          data: { status: data.newStatus },
        });
        return res.json({}, 200);
      } catch (err) {
        error("Error: " + err.message);
        return res.json({ error: "Failed to fetch" }, 500);
      }

    case "updatePlayerLastSeen":
      if (!hasValidArgs([data?.playerId])) {
        return res.json({ error: "Missing parameters" }, 400);
      }

      try {
        await tablesDB.updateRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "players",
          rowId: data.playerId,
          data: { lastSeen: Date.now() },
        });
        return res.json({}, 200);
      } catch (err) {
        error("Error: " + err.message);
        return res.json({ error: "Failed to fetch" }, 500);
      }

    default:
      return res.json({ error: `Action '${action}' not recognized` }, 400);
  }
};
