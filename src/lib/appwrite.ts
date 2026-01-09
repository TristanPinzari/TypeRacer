import { Client, Functions, TablesDB, Realtime } from "appwrite";

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const tablesDB = new TablesDB(client);
const realtime = new Realtime(client);
const functions = new Functions(client);

export { client, realtime, tablesDB, functions };
