import { Router } from 'express';
import { createTweet, deleteTweet, getUserTweets, updateTweet } from "../controllers/tweet.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router();
router.use(verifyJWT);

router.route("/create").post(upload.single("image"), createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/update/:tweetId").patch(upload.single("image"), updateTweet)
router.route("/delete/:tweetId").delete(deleteTweet);

export default router