import { TwUser } from "@prisma/client";
import { TwitterApi, UserV2 } from "twitter-api-v2";
import { logger } from "../logger/index.js";

export const twClient = new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY as string,
    appSecret: process.env.TWITTER_CONSUMER_SECRET as string,
    accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY as string,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string,
});

export const getFollowers = async (id: string) => {
    try {
        return await twClient.v2.followers(id, { asPaginator: true })
    } catch (error) {
        logger.error(error)
    }
}
export const getFollowing = async (id: string) => {
    try {
        return await twClient.v2.following(id, { asPaginator: true })
    } catch (error) {
        logger.error(error)
    }
}