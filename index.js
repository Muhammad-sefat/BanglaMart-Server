const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const path = require("path");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri =
  `mongodb+srv:${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.dbn21dt.mongodb.net?appName=Cluster0` ||
  "your_mongodb_uri_here";

// Mongoose connection
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("Mongoose is connected!");
});

mongoose.connection.on("error", (err) => {
  console.log("Mongoose connection error: ", err);
});

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

// Define Mongoose Schema and Model
const productSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

const Product = mongoose.model("Product", productSchema);

app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});

// Add Product
app.post("/addproduct", async (req, res) => {
  try {
    let products = await Product.find({});
    let id;

    if (products.length > 0) {
      let last_product = products[products.length - 1];
      id = last_product.id + 1;
    } else {
      id = 1;
    }

    const product = new Product({
      id: id,
      name: req.body.name,
      category: req.body.category,
      image: req.body.image,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
    });

    await product.save();
    console.log("Product saved");

    res.json({
      success: true,
      name: req.body.name,
    });

    console.log(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to add product",
    });
  }
});

// Delete Product
app.post("/removeproduct", async (req, res) => {
  try {
    const { id } = req.body;
    await Product.findOneAndDelete({ id: id });
    console.log("Product removed");

    res.json({
      success: true,
      name: req.body.name,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to remove product",
    });
  }
});

app.get("/allproducts", async (req, res) => {
  const products = await Product.find({});
  console.log("All products here");
  res.send(products);
});

const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartdata: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
});

app.post("/signup", async (req, res) => {
  try {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
      return res
        .status(400)
        .json({ success: false, errors: "Found Existing Email" });
    }

    let cart = {};
    for (let i = 1; i <= 300; i++) {
      cart[i] = 0; // Initialize cart with product IDs as keys and 0 as values
    }

    const user = new Users({
      email: req.body.email,
      name: req.body.name,
      password: req.body.password,
      cartdata: cart,
    });

    await user.save();
    const data = {
      user: {
        id: user.id,
      },
    };
    const token = jwt.sign(data, "secret_ecom");
    res.json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.status(500).send({ errors: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const comparePass = req.body.password === user.password;
    if (comparePass) {
      const data = {
        user: {
          id: user.id,
        },
      };
      const token = jwt.sign(data, "secret_ecom");
      res.json({ success: true, token });
    } else {
      res.json({ success: false, errors: "Password Wrong" });
    }
  } else {
    res.json({ success: false, errors: "Wrong Email ID" });
  }
});

// newCollection
app.get("/newcollection", async (req, res) => {
  const products = await Product.find({});
  const newcollection = products.slice(1).slice(-8);
  res.send(newcollection);
});

// popularwomen
app.get("/popularwomen", async (req, res) => {
  const products = await Product.find({ category: "women" });
  const popular_women = products.slice(0, 4);
  res.send(popular_women);
});

// middlewere

const verifytoken = (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send({ errors: "Please Authenticate using valid user" });
  } else {
    try {
      const data = jwt.verify(token, "secret_ecom");
      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).send({ errors: "Please Authenticate using valid user" });
    }
  }
};

// addtocart
app.post("/addtoCart", verifytoken, async (req, res) => {
  try {
    console.log("added", req.body);
    let userData = await Users.findOne({ _id: req.user.id });
    if (!userData) {
      return res.status(404).send({ errors: "User not found" });
    }

    if (!userData.cartdata) {
      userData.cartdata = {};
    }

    if (!userData.cartdata[req.body.itemId]) {
      userData.cartdata[req.body.itemId] = 0;
    }

    userData.cartdata[req.body.itemId] += 1;
    await Users.findOneAndUpdate(
      { _id: req.user.id },
      { cartdata: userData.cartdata }
    );
    res.send({ success: true, message: "Added to cart" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ errors: "Server error" });
  }
});

// removefromcart
app.post("/removetocart", verifytoken, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  if (!userData) {
    return res.status(404).send({ errors: "User not found" });
  }
  if (!userData.cartdata || !userData.cartdata[req.body.itemId]) {
    return res.status(400).send({ errors: "Item not found in cart" });
  }
  userData.cartdata[req.body.itemId] -= 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartdata: userData.cartdata }
  );
  res.send("Removed");
});

// getcartitem
app.post("/getcart", verifytoken, async (req, res) => {
  try {
    let userData = await Users.findOne({ _id: req.user.id });
    if (!userData) {
      return res.status(404).send({ errors: "User not found" });
    }
    if (!userData.cartdata) {
      return res.status(400).send({ errors: "Cart data not found" });
    }
    res.json(userData.cartdata);
  } catch (error) {
    console.error(error);
    res.status(500).send({ errors: "Server error" });
  }
});

app.get("/", (req, res) => {
  res.send("Server is Fully Running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
