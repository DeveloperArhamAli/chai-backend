import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Video } from "../models/video.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Tweet } from "../models/tweet.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { page = 1, limit = 10 } = req.query
    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "Video id is required")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(401, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const videoComments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
                createdAt: 1
            }
        }
    ])

    if (!videoComments.length) {
        throw new ApiError(404, "No comments found for this video")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, videoComments, "Comments fetched successfully"))
})

const addCommentToVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!videoId) {
        throw new ApiError(400, "Video id is required")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(401, "Invalid video id")
    }

    if (!content) {
        throw new ApiError(400, "Comment content is required")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    })

    if (!comment) {
        throw new ApiError(500, "Failed to add comment")
    }

    return res
    .status(201)
    .json(new ApiResponse(200, comment, "Comment added successfully"))

})

const updateVideoComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!commentId) {
        throw new ApiError(400, "Comment id is required")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(401, "Invalid comment id")
    }

    if (!content) {
        throw new ApiError(400, "Comment content is required")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        {new: true}
    )

    if (!updatedComment) {
        throw new ApiError(500, "Failed to update comment")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
})

const deleteVideoComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    
        if (!commentId) {
            throw new ApiError(400, "Comment id is required")
        }
    
        if (!isValidObjectId(commentId)) {
            throw new ApiError(401, "Invalid comment id")
        }
    
        const comment = await Comment.findById(commentId)
    
        if (!comment) {
            throw new ApiError(404, "Comment not found")
        }
    
        if (comment.owner.toString() !== req.user?._id.toString()) {
            throw new ApiError(403, "You are not allowed to delete this comment")
        }
    
        const deletedComment = await Comment.findByIdAndDelete(commentId)
    
        if (!deletedComment) {
            throw new ApiError(500, "Failed to delete comment")
        }
    
        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully"))
})

const getTwetComments = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query
    const { tweetId } = req.params

    if (!tweetId) {
        throw new ApiError(400, "Tweet id is required")
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(401, "Invalid tweet id")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    const tweetComments = await Comment.aggregate([
        {
            $match: {
                tweet: new mongoose.Types.ObjectId(tweetId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
                createdAt: 1
            }
        }
    ])

    if (!tweetComments.length) {
        throw new ApiError(404, "No comments found for this tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, tweetComments, "Comments fetched successfully"))
})

const addCommentToTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!tweetId) {
        throw new ApiError(400, "Tweet id is required")
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(401, "Invalid tweet id")
    }

    if (!content) {
        throw new ApiError(400, "Comment content is required")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    const comment = await Comment.create({
        content,
        tweet: tweetId,
        owner: req.user?._id
    })

    if (!comment) {
        throw new ApiError(500, "Failed to add comment")
    }

    return res
    .status(201)
    .json(new ApiResponse(200, comment, "Comment added successfully"))

})

const updateTweetComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!commentId) {
        throw new ApiError(400, "Comment id is required")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(401, "Invalid comment id")
    }

    if (!content) {
        throw new ApiError(400, "Comment content is required")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        {new: true}
    )

    if (!updatedComment) {
        throw new ApiError(500, "Failed to update comment")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
})

const deleteTweetComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    
        if (!commentId) {
            throw new ApiError(400, "Comment id is required")
        }
    
        if (!isValidObjectId(commentId)) {
            throw new ApiError(401, "Invalid comment id")
        }
    
        const comment = await Comment.findById(commentId)
    
        if (!comment) {
            throw new ApiError(404, "Comment not found")
        }
    
        if (comment.owner.toString() !== req.user?._id.toString()) {
            throw new ApiError(403, "You are not allowed to delete this comment")
        }
    
        await Comment.findByIdAndDelete(commentId)
    
        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully"))
})

export {
    getVideoComments, 
    addCommentToVideo, 
    updateVideoComment,
    deleteVideoComment,
    getTwetComments,
    addCommentToTweet,
    updateTweetComment,
    deleteTweetComment,
}