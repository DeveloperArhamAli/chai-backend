import { Router } from 'express';
import { deleteVideo, getAllVideos, getVideoById, publishAVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router();
router.use(verifyJWT);

router.route("/").get(getAllVideos)
router.route("/publish").post(upload.fields([
    {
        name: "videoFile",
        maxCount: 1,
    },
    {
        name: "thumbnail",
        maxCount: 1,
    }
]), publishAVideo)
router.route("/:videoId").get(getVideoById)
router.route("/update/:videoId").patch(upload.single("thumbnail"), updateVideo);
router.route("/toggle/publish/:videoId").patch(togglePublishStatus);
router.route("/delete/:videoId").delete(deleteVideo)

export default router