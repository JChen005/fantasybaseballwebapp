const app = require("../src/app");
const { connectDb } = require("../src/config/db");
const { validateBackendEnv } = require("../src/config/env");

let readyPromise;

function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      validateBackendEnv();
      await connectDb();
    })();
  }

  return readyPromise;
}

module.exports = async (req, res) => {
  await ready();
  return app(req, res);
};
