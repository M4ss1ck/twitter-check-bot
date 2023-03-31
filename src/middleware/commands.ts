import { Composer } from "telegraf";
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
            const previousFollowers = user.twitterCircle
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

            const text = `You have ${newFollowers.length} new followers\n${noLongerFollowers.length} users stop following you\n\nTotal: ${previousFollowers.length + newFollowers.length - noLongerFollowers.length}`
            ctx.reply(text)
        } else {
            ctx.reply('It seems like you haven\'t set you Twitter ID. You can use <code>/get username</code>, where <code>username</code> is your Twitter handle, to get your Twitter ID, then use <code>/myid id</code> replacing <code>id</code> with the value you just got and then try this command again.', {
                parse_mode: "HTML"
            })
        }
    }
})