import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./.env"
});

connectDB()
.then(() => {
    app.on("error", (error) => {
        console.error(`Server error: ${error}`);
        throw error;
    })
    app.listen(process.env.PORT || 3000, () => {
        console.log(`⚙️  Server is running on port ${process.env.PORT || 3000}`);
    })
})
.catch((error) => {
    console.error(`MONGODB CONNECTION ERROR !!: ${error}`);
})