export default async ({ req, res, log, error }) => {
  const data = {
    message: "Hello from the Backend!",
    status: "online",
  };

  // This line "forces" the data to show up in the Logs tab
  log(JSON.stringify(data));

  return res.json(data);
};
