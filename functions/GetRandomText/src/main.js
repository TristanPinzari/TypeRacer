export default async ({ req, res, log, error }) => {
  // This message will show up in your Appwrite Console logs
  log("Function was triggered successfully!");

  // This is what gets sent back to your React app
  return res.json({
    message: "Hello from the Backend!",
    status: "online",
  });
};
