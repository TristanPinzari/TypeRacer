import {
  Client,
  ID,
  TablesDB,
  Query,
  Functions,
  ExecutionMethod,
} from "node-appwrite";

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

    case "getRandomText":
      return GetRandomText(false);

    case "getTextById":
      if (!hasValidArgs([data?.textId])) {
        return res.json({ error: "Missing parameters" }, 400);
      }

      try {
        const text = await tablesDB.getRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "texts",
          rowId: data.textId,
        });
        return res.json(
          {
            content: text.content,
            origin: text.origin,
            author: text.author,
            type: text.type,
            uploader: text.uploader,
          },
          200
        );
      } catch (error) {
        return res.json({ error: "Failed to fetch" }, 500);
      }

    case "joinRace":
      if (!hasValidArgs([data?.playerId])) {
        return res.json({ error: "Missing parameters" }, 400);
      }
      try {
        const now = Date.now();
        const startingSoonBuffer = now + 5000;
        const waitingRaces = await tablesDB.listRows({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "races",
          queries: [Query.isNull("startTime"), Query.isNull("host")],
        });
        const startingRaces = await tablesDB.listRows({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "races",
          queries: [
            Query.isNull("host"),
            Query.greaterThan("startTime", now),
            Query.lessThan("startTime", startingSoonBuffer),
          ],
        });
        const availableRaces = [...startingRaces.rows, ...waitingRaces.rows];
        let newRaceId = null;
        if (availableRaces.length > 0) {
          const race = availableRaces[0];
          const updatedPlayers = [...race.players, data.playerId];
          const updateData = { players: updatedPlayers };
          if (updatedPlayers.length === 2) {
            updateData.startTime = Date.now() + 10000;
          } else if (
            updatedPlayers.length === 5 &&
            race.startTime - Date.now() > 5000
          ) {
            updateData.startTime = Date.now() + 3000;
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
        return res.json({ error: "Failed to fetch" }, 500);
      }

    case "joinRaceById":
      if (!hasValidArgs([data?.playerId, data?.raceId])) {
        return res.json({ error: "Missing parameters" }, 400);
      }
      try {
        const race = await tablesDB.getRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "races",
          rowId: data.raceId,
        });
        await tablesDB.updateRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "races",
          rowId: data.raceId,
          data: { players: [...race.players, data.playerId] },
        });
      } catch (error) {
        return res.json({ error: error }, 404);
      }
      try {
        await tablesDB.updateRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "players",
          rowId: data.playerId,
          data: { raceId: data.raceId },
        });
        return res.json({ raceId: data.raceId }, 200);
      } catch (error) {
        return res.json({ error: error }, 500);
      }

    case "createPrivateRace":
      if (!hasValidArgs([data?.playerId])) {
        return res.json({ error: "Missing parameters" }, 400);
      }
      const newId = ID.unique();
      try {
        const newTextId = await GetRandomText(true);
        await tablesDB.createRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "races",
          rowId: newId,
          data: {
            textId: newTextId,
            players: [data.playerId],
            host: data.playerId,
          },
        });
      } catch (error) {
        return res.json({ error: error }, 500);
      }
      try {
        await tablesDB.updateRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "players",
          rowId: data.playerId,
          data: { raceId: newId },
        });
        return res.json({ raceId: newId }, 200);
      } catch (error) {
        return res.json({ error: error }, 500);
      }

    case "startRace":
      if (!hasValidArgs([data?.raceId])) {
        return res.json({ error: "Missing parameters" }, 400);
      }
      try {
        const race = await tablesDB.getRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "races",
          rowId: data.raceId,
        });
        if (race.startTime && race.status == "active") {
          return res.json({ error: "Race is already ongoing." }, 400);
        }
        await tablesDB.updateRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "races",
          rowId: data.raceId,
          data: { startTime: Date.now() + 3000, status: "active" },
        });
        return res.json({}, 200);
      } catch (error) {
        return res.json({ error: error }, 500);
      }

    case "endRace":
      if (!hasValidArgs([data?.raceId])) {
        return res.json({ error: "Missing parameters" }, 400);
      }
      try {
        const race = await tablesDB.getRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "races",
          rowId: data.raceId,
        });
        if (race.status == "finished") {
          return res.json({ error: "Race has already ended." }, 400);
        }
        await tablesDB.updateRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "races",
          rowId: data.raceId,
          data: { startTime: null, status: "finished" },
        });
        return res.json({}, 200);
      } catch (error) {
        return res.json({ error: error }, 500);
      }

    case "resetRace":
      if (!hasValidArgs([data?.raceId])) {
        return res.json({ error: "Missing parameters" }, 400);
      }
      try {
        const newTextId = await GetRandomText(true);
        await tablesDB.updateRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "races",
          rowId: data.raceId,
          data: { textId: newTextId, startTime: null, status: "waiting" },
        });
        return res.json({}, 200);
      } catch (error) {
        return res.json({ error: error }, 500);
      }

    case "updateStats":
      if (!hasValidArgs([data?.playerId, data?.wpm, data?.progress])) {
        return res.json({ error: "Missing parameters" }, 400);
      }
      try {
        await tablesDB.updateRow({
          databaseId: process.env.APPWRITE_DATABASE_ID,
          tableId: "players",
          rowId: data.playerId,
          data: { wpm: data.wpm, progress: data.progress },
        });
        return res.json({}, 200);
      } catch (error) {
        return res.json({ error: error }, 500);
      }

    default:
      return res.json({ error: `Action '${action}' not recognized` }, 400);
  }
};
