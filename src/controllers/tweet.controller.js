import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"

const createTweet = asyncHandler(async (req, res) => {
    const { heading, content } = req.body;

    if (!(heading && content)) {
        throw new ApiError(400, "Heading and content are required");
    }

    let imageData = null;
    const imageLocalPath = req.file?.path;

    if (imageLocalPath) {
        const image = await uploadOnCloudinary(imageLocalPath);
        if (!image) {
            throw new ApiError(400, "Image upload on Cloudinary failed");
        }
        
        imageData = {
            public_id: image.public_id,
            url: image.url
        };
    }

    const tweet = await Tweet.create({
        heading,
        content,
        owner: req.user?._id,
        ...(imageData && { image: imageData })
    });

    if (!tweet) {
        throw new ApiError(400, "Tweet creation failed");
    }

    return res
        .status(201)
        .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {

    const { userId } = req.params;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    const userTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
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
                foreignField: "tweet",
                as: "likes",
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "tweet",
                as: "comments",
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [userId, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                },
                owner: {
                    $first: "$owner"
                },
                commentsCount: {
                    $size: "$comments"
                }
            }
        },
        {
            $project: {
                "image.url": 1,
                heading: 1,
                content: 1,
                owner: 1,
                createdAt: 1,
                likesCount: 1,
                commentsCount: 1,
                isLiked: 1,
            }
        }
    ])

    if (!userTweets.length) {
        throw new ApiError(404, "No tweets found for this user");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, userTweets, "User tweets fetched successfully"));
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { heading, content } = req.body;

    if (!(heading && content)) {
        throw new ApiError(400, "Heading and content are required");
    }

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this tweet");
    }

    let imageToBeDeleted = null;
    let imageData = null;

    if (tweet.image?.public_id) {
        imageToBeDeleted = tweet.image.public_id;
    }

    const imageLocalPath = req.file?.path;

    if (imageLocalPath) {
        const image = await uploadOnCloudinary(imageLocalPath);
        if (!image) {
            throw new ApiError(400, "Image upload on Cloudinary failed");
        }

        imageData = {
            public_id: image.public_id,
            url: image.url
        };
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            heading,
            content,
            ...(imageData && { image: imageData })
        },
        {new: true}
    );

    if (imageToBeDeleted) {
        await deleteFromCloudinary(imageToBeDeleted);
    }

    if (!updatedTweet) {
        throw new ApiError(400, "Tweet update failed");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    
    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this tweet");
    }

    if (tweet.image?.public_id) {
        await deleteFromCloudinary(tweet.image.public_id);
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}