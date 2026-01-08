import { Client, ID, TablesDB, Query } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  // Initialization
  const client = new Client()
    .setEndpoint("https://tor.cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const tablesDB = new TablesDB(client);

  // Helper functions
  function hasValidArgs(args) {
    return args.every((arg) => arg !== undefined && arg !== null);
  }

  async function GetRandomText(onlyId) {
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

      if (onlyId) {
        return pickedDoc.$id;
      }

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

    // case "updatePlayerStatus":
    //   if (!hasValidArgs([data?.playerId, data?.newStatus])) {
    //     return res.json({ error: "Missing parameters" }, 400);
    //   }

    //   try {
    //     await tablesDB.updateRow({
    //       databaseId: process.env.APPWRITE_DATABASE_ID,
    //       tableId: "players",
    //       rowId: data.playerId,
    //       data: { status: data.newStatus },
    //     });
    //     return res.json({}, 200);
    //   } catch (err) {
    //     error("Error: " + err.message);
    //     return res.json({ error: "Failed to fetch" }, 500);
    //   }

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

    // case "getTextById":

    case "getRandomText":
      return GetRandomText(false);

    case "joinRace":
      if (!hasValidArgs([data?.playerId])) {
        return res.json({ error: "Missing parameters" }, 400);
      }
      try {
        const availableRaces = await tablesDB.listRows({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "races",
          queries: [Query.equal("status", "waiting"), Query.limit(1)],
        });
        let newRaceId = null;
        if (availableRaces.total > 0) {
          log(availableRaces);
          const race = availableRaces.rows[0];
          const updatedPlayers = [...race.players, data.playerId];
          const updateData = { players: updatedPlayers };
          if (updatedPlayers.length === 2) {
            updateData.status = "active";
            updateData.startTime = Date.now() + 15000;
          } else if (
            updatedPlayers.length === 5 &&
            race.startTime - Date.now() > 5000
          ) {
            updateData.startTime = Date.now() + 5000;
          }
          await tablesDB.updateRow({
            databaseId: process.env.APPWRITE_DATABASE_ID,
            tableId: "races",
            rowId: race.$id,
            data: updateData,
          });
          newRaceId = race.$id;
        } else {
          const newId = ID.unique();
          const newTextId = await GetRandomText(true);
          await tablesDB.createRow({
            databaseId: process.env.APPWRITE_DATABASE_ID,
            tableId: "races",
            rowId: newId,
            data: { textId: newTextId, players: [data.playerId] },
          });
          newRaceId = newId;
        }
        await tablesDB.updateRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "players",
          rowId: data.playerId,
          data: { raceId: newRaceId },
        });
        return res.json({ raceId: newRaceId }, 200);
      } catch (err) {
        error("Error: " + err.message);
        return res.json({ error: "Failed to fetch" }, 500);
      }

    default:
      return res.json({ error: `Action '${action}' not recognized` }, 400);
  }
};
