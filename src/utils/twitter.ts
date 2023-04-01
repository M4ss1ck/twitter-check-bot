import { User, TwUser } from "@prisma/client";
import { TwitterApi, UserV2, ApiResponseError } from "twitter-api-v2";
import { logger } from "../logger/index.js";
import { prisma } from "../db/prisma.js";

export type FullUser = User & {
    twId: string
    twitterCircle: TwUser[]
}

export const twClient = new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY as string,
    appSecret: process.env.TWITTER_CONSUMER_SECRET as string,
    accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY as string,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string,
});

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function autoRetryOnRateLimitError<T>(callback: () => T | Promise<T>) {
    while (true) {
        try {
            return await callback();
        } catch (error) {
            if (error instanceof ApiResponseError && error.rateLimitError && error.rateLimit) {
                const resetTimeout = error.rateLimit.reset * 1000; // convert to ms time instead of seconds time
                const timeToWait = resetTimeout - Date.now();

                await sleep(timeToWait);
                continue;
            }

            throw error;
        }
    }
}

export const getFollowers = async (id: string) => {
    try {
        // return await twClient.v2.followers(id, { asPaginator: true, max_results: 1000 })
        let result = await twClient.v2.followers(id, { max_results: 1000 })
        logger.info(result.meta)
        logger.error(result.errors)
        let nextToken = result.meta ? result.meta.next_token : undefined
        let followers = result.data
        while (nextToken) {
            let tempFollowers = await twClient.v2.followers(id, { max_results: 1000, pagination_token: nextToken })
            tempFollowers.data && followers.push(...tempFollowers.data)
            nextToken = tempFollowers.meta ? tempFollowers.meta.next_token : undefined
            logger.info(tempFollowers.meta)
            logger.error(tempFollowers.errors)
        }
        return followers
    } catch (error) {
        logger.error(error)
    }
}

export const getFollowing = async (id: string) => {
    try {
        // return await twClient.v2.following(id, { asPaginator: true })
        let result = await twClient.v2.following(id, { max_results: 1000 })
        logger.info(result.meta)
        logger.error(result.errors)
        let nextToken = result.meta ? result.meta.next_token : undefined
        let followings = result.data
        while (nextToken) {
            let tempFollowings = await twClient.v2.following(id, { max_results: 1000, pagination_token: nextToken })
            tempFollowings.data && followings.push(...tempFollowings.data)
            nextToken = tempFollowings.meta ? tempFollowings.meta.next_token : undefined
            logger.info(tempFollowings.meta)
            tempFollowings.errors && logger.error(tempFollowings.errors)
        }
        return followings
    } catch (error) {
        logger.error(error)
    }
}

export const getUserByUsername = async (username: string) => {
    try {
        return await twClient.v2.userByUsername(username)
    } catch (error) {
        logger.error(error)
    }
}

export const allFollowerData = async (user: FullUser) => {
    const previousFollowers = user.twitterCircle.filter(u => u.follower)
    const previousFollowersIds = previousFollowers.map(f => f.twId)
    const followers = await getFollowers(user.twId)

    let newFollowers = []
    let noLongerFollowers = previousFollowers
    if (followers) {
        for await (const follower of followers) {
            await prisma.twUser.upsert({
                where: {
                    twId_userId: {
                        twId: follower.id,
                        userId: user.id,
                    }
                },
                update: {
                    name: follower.name,
                    username: follower.username,
                    follower: true,
                },
                create: {
                    twId: follower.id,
                    name: follower.name,
                    username: follower.username,
                    follower: true,
                    userId: user.id
                }
            })

            if (!previousFollowersIds.includes(follower.id)) {
                newFollowers.push(follower)
            }
            else {
                noLongerFollowers = noLongerFollowers.filter(f => f.twId !== follower.id)
            }
        }
        for await (const unfollower of noLongerFollowers) {
            await prisma.twUser.update({
                where: {
                    twId_userId: {
                        twId: unfollower.twId,
                        userId: user.id,
                    }
                },
                data: {
                    follower: false,
                },
            }).catch(logger.error)
        }
    }
    return {
        total: previousFollowers.length + newFollowers.length - noLongerFollowers.length,
        news: newFollowers,
        nopes: noLongerFollowers,
    }
}

export const allFollowingData = async (user: FullUser) => {
    const previousFollowings = user.twitterCircle.filter(u => u.following)
    const previousFollowingsIds = previousFollowings.map(f => f.twId)
    const followings = await getFollowing(user.twId)

    let newFollowings = []
    let noLongerFollowings = previousFollowings
    if (followings) {
        for await (const following of followings) {
            await prisma.twUser.upsert({
                where: {
                    twId_userId: {
                        twId: following.id,
                        userId: user.id,
                    }
                },
                update: {
                    name: following.name,
                    username: following.username,
                    following: true,
                },
                create: {
                    twId: following.id,
                    name: following.name,
                    username: following.username,
                    following: true,
                    userId: user.id
                }
            })

            if (!previousFollowingsIds.includes(following.id)) {
                newFollowings.push(following)
            }
            else {
                noLongerFollowings = noLongerFollowings.filter(f => f.twId !== following.id)
            }
        }
        for await (const unfollowing of noLongerFollowings) {
            await prisma.twUser.update({
                where: {
                    twId_userId: {
                        twId: unfollowing.twId,
                        userId: user.id,
                    }
                },
                data: {
                    following: false,
                },
            }).catch(logger.error)
        }
    }
    return {
        total: previousFollowings.length + newFollowings.length - noLongerFollowings.length,
        news: newFollowings,
        nopes: noLongerFollowings,
    }
}