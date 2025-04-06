import { Router } from 'express';
import { addCommentToTweet, addCommentToVideo, deleteTweetComment, deleteVideoComment, getTwetComments, getVideoComments, updateTweetComment, updateVideoComment } from "../controllers/comment.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT);

router.route("/:videoId").get(getVideoComments);
router.route("/add/video/:videoId").post(addCommentToVideo);
router.route("/update/video/:commentId").patch(updateVideoComment);
router.route("/delete/video/:commentId").delete(deleteVideoComment)
router.route("/:tweetId").get(getTwetComments);
router.route("/add/video/:tweetId").post(addCommentToTweet);
router.route("/update/video/:commentId").patch(updateTweetComment);
router.route("/delete/video/:commentId").delete(deleteTweetComment)

export default router