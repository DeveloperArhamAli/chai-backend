import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $group: {
                _id: null,
                subscribersCount: {
                    $sum: 1
                }
            }
        }
    ])

    const videoDetails = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
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
            $project: {
                totalLikes: {
                    $size: "$likes"
                },
                totalViews: "$views",
                totalVideos: 1
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: {
                    $sum: "$totalLikes"
                },
                totalViews: {
                    $sum: "$totalViews"
                },
                totalVideos: {
                    $sum: 1
                }
            }
        }
    ])

    const channelStats = {
        totalSubscribers: totalSubscribers[0].subscribersCount,
        totalLikes: videoDetails[0].totalLikes,
        totalVideos: videoDetails[0].totalVideos,
        totalViews: videoDetails[0].totalViews
    }

    if (!channelStats.length) {
        throw new ApiError(404, "Channel stats not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channelStats, "Channel stats fetched successfully"))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const videos = Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
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
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                createdAt: {
                    $dateToParts: {
                        date: "$createdAt"
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
                "thumbnail.url": 1,
                title: 1,
                description: 1,
                createdAt: {
                    year: 1,
                    month: 1,
                    day: 1,
                },
                isPublished: 1,
                likesCount: 1
            }
        }
    ])

    if (!videos) {
        throw new ApiError(404, "No videos found for this channel")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos for this channel fetched successfully"))
})

export {
    getChannelStats, 
    getChannelVideos
}