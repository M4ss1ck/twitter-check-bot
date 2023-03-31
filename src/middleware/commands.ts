import { Composer, Markup } from "telegraf";
import { prisma } from "../db/prisma.js";
import { logger } from "../logger/index.js";
import { getUserByUsername, getFollowers, getFollowing } from "../utils/twitter.js";

export const commands = new Composer()

commands.command('get', async ctx => {
    if (ctx.chat.type === 'private') {
        const username = ctx.message.text.replace(/^\/get(@\w+)?/, '').trim()
        if (username.length > 3) {
            const user = await getUserByUsername(username)
            logger.info(user)
            ctx.reply('check terminal for response from server')
        } else {
            ctx.reply('Type an username next to the command as in <code>/get m4ss1ck</code>', {
                parse_mode: 'HTML'
            })
        }
    }
})

commands.command('myid', async ctx => {
    if (ctx.chat.type === 'private') {
        const id = ctx.message.text.replace(/^\/myid(@\w+)?/, '').trim()
        if (id.length > 3) {
            const user = await prisma.user.upsert({
                where: {
                    tgId: ctx.from.id.toString(),
                },
                update: {
                    tgId: ctx.from.id.toString(),
                    name: ctx.from.first_name,
                    twId: id,
                },
                create: {
                    tgId: ctx.from.id.toString(),
                    name: ctx.from.first_name,
                    twId: id,
                }
            })
            logger.info(user)
            ctx.reply(user ? 'Your id was updated' : 'Your id couldn\'t be updated... Contact the admin.')
        } else {
            ctx.reply('Type your Twitter ID as in <code>/myid 1234567890</code>', {
                parse_mode: 'HTML'
            })
        }
    }
})

commands.command('followers', async ctx => {
    if (ctx.chat.type === 'private') {
        const tgId = ctx.from.id.toString()
        const user = await prisma.user.findUnique({
            where: {
                tgId,
            },
            include: {
                twitterCircle: true
            }
        })
        if (user && user.twId) {
            const previousFollowers = user.twitterCircle.filter(u => u.follower)
            const previousFollowersIds = previousFollowers.map(f => f.twId)
            const isFirstTime = previousFollowers.length === 0
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
            }

            const text = `You have ${newFollowers.length} new followers\n${noLongerFollowers.length} accounts stop following you\n\nTotal: ${previousFollowers.length + newFollowers.length - noLongerFollowers.length}`
            ctx.reply(text, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    Markup.button.callback('Export List', `exportFollowers_${user.id}`)
                ])
            })
        } else {
            ctx.reply('It seems like you haven\'t set you Twitter ID. You can use <code>/get username</code>, where <code>username</code> is your Twitter handle, to get your Twitter ID, then use <code>/myid id</code> replacing <code>id</code> with the value you just got and then try this command again.', {
                parse_mode: "HTML"
            })
        }
    }
})

commands.command('following', async ctx => {
    if (ctx.chat.type === 'private') {
        const tgId = ctx.from.id.toString()
        const user = await prisma.user.findUnique({
            where: {
                tgId,
            },
            include: {
                twitterCircle: true
            }
        })
        if (user && user.twId) {
            const previousFollowings = user.twitterCircle.filter(u => u.following)
            const previousFollowingsIds = previousFollowings.map(f => f.twId)
            const isFirstTime = previousFollowings.length === 0
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
            }

            const text = `You are following ${newFollowings.length} new accounts\nYou stopped following ${noLongerFollowings.length} accounts\n\nTotal: ${previousFollowings.length + newFollowings.length - noLongerFollowings.length}`
            ctx.reply(text, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    Markup.button.callback('Export List', `exportFollowings_${user.id}`)
                ])
            })
        } else {
            ctx.reply('It seems like you haven\'t set you Twitter ID. You can use <code>/get username</code>, where <code>username</code> is your Twitter handle, to get your Twitter ID, then use <code>/myid id</code> replacing <code>id</code> with the value you just got and then try this command again.', {
                parse_mode: "HTML"
            })
        }
    }
})