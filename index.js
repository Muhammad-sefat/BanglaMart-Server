const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const path = require("path");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://muhammadsefat55:kDnPSfuKLIlW15D2@cluster0.dbn21dt.mongodb.net/?appName=Cluster0";
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});
const upload = multer({ storage: storage });
app.use("/images", express.static(path.join(__dirname, "upload/images")));

async function run() {
  try {
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverApi: ServerApiVersion.v1,
    });

    await client.connect();
    const database = client.db("your_database_name");
    const collection = database.collection("your_collection_name");

    app.post("/upload", upload.single("product"), (req, res) => {
      res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`,
      });
    });

    const Product = mongoose.model("Product", {
      id: {
        type: Number,
        require: true,
      },
      name: {
        type: Number,
        require: true,
      },
      image: {
        type: Number,
        require: true,
      },
      category: {
        type: Number,
        require: true,
      },
    });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is Fully Runing");
});

app.listen(port, () => {
  console.log(`Server is Runing on Port ${port}`);
});
