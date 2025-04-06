import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination 

    const pageNumber = parseInt(page)
    const limitNumber = parseInt(limit)

    const videos = await Video.aggregate([
        {
            $match: {
                isPublished: true,
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
                            fullname: 1,
                            "avatar.url": 1
                        }
                    }
                ]                                                               
            }   
        },
        {
            $project: {
                "thumbnail.url": 1,
                title: 1,
                views: 1,
                owner: 1,
                createdAt: 1,
                duration: 1,
            }
        }
    ])

    if (!videos) {
        throw new ApiError(404, "Videos not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description, isPublished } = req.body;

    if ([title, description, isPublished].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    const videoLocalPath = req.files?.videoFile[0]?.path;

    if (!(thumbnailLocalPath && videoLocalPath)) {
        throw new ApiError(400, "Thumbnail and video files are required");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    const videoFile = await uploadOnCloudinary(videoLocalPath);

    if (!(thumbnail && videoFile)) {
        throw new ApiError(500, "Something went wrong while uploading files to cloudinary");
    }

    const video = await Video.create({
        title,
        description,
        thumbnail: {
            public_id: thumbnail.public_id,
            url: thumbnail.url
        },
        videoFile: {
            public_id: videoFile.public_id,
            url: videoFile.url
        },
        isPublished,
        duration: videoFile.duration,
        owner: req.user?._id,
    })

    if (!video) {
        throw new ApiError(500, "Something went wrong while creating video");
    }

    return res
    .status(201)
    .json(new ApiResponse(200, video, "Video created successfully"));

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "Video id is required")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $match: {
                isPublished: true
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments",
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
                                        "avatar.url": 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
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
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            },
                        }
                    },
                    {
                        $project: {
                            fullname: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                "videoFile.url": 1,
                "thumbnail.url": 1,
                title: 1,
                description: 1,
                likesCount: 1,
                isLiked: 1,
                views: 1,
                owner: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                isPublished: 1,
            }
        }
    ])

    await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: {
                views: 1
            }
        }
    )

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $addToSet: {
                watchHistory: videoId
            }
        }
    )

    if (!video.length > 0) {
        throw new ApiError(404, "Video not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.path;

    if (!videoId) {
        throw new ApiError(400, "Video id is required")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    if (!(title || description)) {
        throw new ApiError(400, "Title and description are required")
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }

    const video = await Video.findById(videoId).select("thumbnail.public_id owner");

    if (video?.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this video")
    }

    const thumbnailToBeDeleted = video?.thumbnail?.public_id;

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
        throw new ApiError(500, "Something went wrong while uploading thumbnail to cloudinary")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    public_id: thumbnail.public_id,
                    url: thumbnail.url
                }
            }
        },
        {new: true}
    )

    if (!updatedVideo) {
        throw new ApiError(500, "Something went wrong while updating video")
    }

    await deleteFromCloudinary(thumbnailToBeDeleted)

    return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "Video id is required")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id") 
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video?.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this video")
    }

    const thumbnailToBeDeleted = video?.thumbnail?.public_id;
    const videoToBeDeleted = video?.videoFile?.public_id;

    await deleteFromCloudinary(thumbnailToBeDeleted)
    await deleteFromCloudinary(videoToBeDeleted)

    await Video.findByIdAndDelete(videoId)

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video id is required")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video?.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this video")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        {new: true}
    )

    if (!updatedVideo) {
        throw new ApiError(500, "Something went wrong while updating video")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, { isPublished: updatedVideo.isPublished }, "Video updated successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}