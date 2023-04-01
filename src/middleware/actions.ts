import { Composer, Markup, Input } from "telegraf";
import { prisma } from "../db/prisma.js";
import { logger } from "../logger/index.js";
import { csvExport } from "../utils/csvExport.js";
import { unlink } from "fs/promises";

export const actions = new Composer()

actions.action(/^exportAll_\d+/i, async ctx => {
    if ('data' in ctx.callbackQuery) {
        const userId = ctx.callbackQuery.data.replace(/^exportAll_/i, '').trim()
        if (!ctx.from || ctx.from.id.toString() !== userId) {
            await ctx.answerCbQuery('this is not your data')
        }
        await ctx.answerCbQuery().catch(logger.error)

        const result = await prisma.user.findUnique({
            where: {
                tgId: userId
            },
            select: {
                twitterCircle: true
            }
        })

        if (result && result.twitterCircle.length > 0) {
            const path = `Followers_${userId}.csv`
            const data = result.twitterCircle.map(user => ({
                twId: user.twId,
                name: user.name,
                username: `@${user.username}`,
                follower: user.follower ? "Yes" : "No",
                following: user.following ? "Yes" : "No",
            }))
            const headers = [
                { id: 'twId', title: 'Twitter ID' },
                { id: 'name', title: 'Name' },
                { id: 'username', title: 'Twitter handle' },
                { id: 'follower', title: 'Follower' },
                { id: 'following', title: 'Following' },
            ]
            const success = await csvExport(path, data, headers)
            if (success) {
                await ctx.replyWithDocument((Input.fromLocalFile(path)), {
                    caption: 'List of accounts related to you'
                }).catch(logger.error)
                await unlink(path)
            }
        }
        else {
            ctx.reply('No info in database!')
        }
    }
})