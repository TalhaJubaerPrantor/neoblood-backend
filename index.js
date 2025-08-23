const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const userRoutes = require("./Routes/userRoute");

const app = express();
const PORT = 3000;


app.use(cors());
app.use(express.json());




app.post('/register', userRoutes);
app.post('/login', userRoutes);








mongoose.connect("mongodb://localhost:27017/neoblood", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.error("Error connecting to MongoDB:", err);
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
