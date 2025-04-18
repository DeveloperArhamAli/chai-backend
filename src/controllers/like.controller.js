import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "Video id is required")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(401, "Invalid video id")
    }

    const isLiked = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })

    if (!isLiked) {
        await Like.create({
            video: videoId,
            likedBy: req.user?._id
        })

        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video liked successfully"))

    } else {

        await Like.findByIdAndDelete(isLiked._id)

        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video unliked successfully"))
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!commentId) {
        throw new ApiError(400, "Comment id is required")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(401, "Invalid comment id")
    }

    const isLiked = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })

    if (!isLiked) {
        await Like.create({
            comment: commentId,
            likedBy: req.user?._id
        })

        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment liked successfully"))

    } else {

        await Like.findByIdAndDelete(isLiked._id)

        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment unliked successfully"))
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!tweetId) {
        throw new ApiError(400, "Tweet id is required")
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(401, "Invalid tweet id")
    }

    const isLiked = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if (!isLiked) {
        await Like.create({
            tweet: tweetId,
            likedBy: req.user?._id
        })

        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet liked successfully"))

    } else {

        await Like.findByIdAndDelete(isLiked._id)

        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet unliked successfully"))
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        "avatar.url": 1,
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 0,
                likedVideos: {
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    owner: 1,
                    createdAt: 1,
                }
            }
        }
    ])

    if (!likedVideos.length) {
        throw new ApiError(404, "No liked videos found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}