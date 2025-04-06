import mongoose from "mongoose";

const tweetSchema = new mongoose.Schema({
    image: {
        type: {
            url: {
                type: String,
            },
            public_id: {
                type: String,
            },
        },
    },
    heading: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
})

export const Tweet = mongoose.model("Tweet", tweetSchema);