import { User, TwUser } from "@prisma/client";
import { TwitterApi, UserV2 } from "twitter-api-v2";
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