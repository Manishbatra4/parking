require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const routes = require("./router/index");
const mongoose = require("mongoose");

const rateLimit = require("express-rate-limit");

const port = process.env.PORT;

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

/* within 15 min if it receive more the 100 request it will display
 *   429 Error Too many requests, please try again later.
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);
app.use(routes);

app.listen(port, () => {
  console.log(`server is running at http://localhost:${port}`);
});
