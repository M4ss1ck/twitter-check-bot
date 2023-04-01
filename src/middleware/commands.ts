import { Composer, Markup, Input } from "telegraf";
import { prisma } from "../db/prisma.js";
import { logger } from "../logger/index.js";
import { getUserByUsername, allFollowerData, allFollowingData, FullUser } from "../utils/twitter.js";
import { csvExport } from "../utils/csvExport.js";
import { unlink } from "fs/promises";

export const commands = new Composer()

commands.command('get', async ctx => {
    if (ctx.chat.type === 'private') {
        const username = ctx.message.text.replace(/^\/get(@\w+)?/, '').trim()
        if (username.length > 3) {
            const user = await getUserByUsername(username)
            logger.info(user)
            const text = JSON.stringify(user, null, 2)
            ctx.reply(text, {
                parse_mode: 'HTML'
            })
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
        const message = await ctx.reply("Loading...")
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
            const { total, news, nopes } = await allFollowerData(user as FullUser)
            if (news.length > 0) {
                const path = `New_followers_${user.tgId}.csv`
                const data = news.map(user => ({
                    twId: user.id,
                    name: user.name,
                    username: `@${user.username}`,
                }))
                const headers = [
                    { id: 'twId', title: 'Twitter ID' },
                    { id: 'name', title: 'Name' },
                    { id: 'username', title: 'Twitter handle' },
                ]
                const success = await csvExport(path, data, headers)
                if (success) {
                    await ctx.replyWithDocument(Input.fromLocalFile(path), {
                        caption: 'Accounts that started following you'
                    }).catch(logger.error)
                    await unlink(path)
                }
            }
            if (nopes.length > 0) {
                const path = `No_longer_followers_${user.tgId}.csv`
                const data = nopes.map(user => ({
                    twId: user.twId,
                    name: user.name,
                    username: `@${user.username}`,
                }))
                const headers = [
                    { id: 'twId', title: 'Twitter ID' },
                    { id: 'name', title: 'Name' },
                    { id: 'username', title: 'Twitter handle' },
                ]
                const success = await csvExport(path, data, headers)
                if (success) {
                    await ctx.replyWithDocument((Input.fromLocalFile(path)), {
                        caption: 'Accounts that stopped following you'
                    }).catch(logger.error)
                    await unlink(path)
                }
            }
            const text = `You have ${news.length} new followers\n${nopes.length} accounts stop following you\n\nTotal: ${total}`
            ctx.telegram.editMessageText(ctx.chat.id, message.message_id, undefined, text, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    Markup.button.callback('Export List', `exportFollowers_${user.tgId}`)
                ])
            }).catch(logger.error)
        } else {
            ctx.reply('It seems like you haven\'t set you Twitter ID. You can use <code>/get username</code>, where <code>username</code> is your Twitter handle, to get your Twitter ID, then use <code>/myid id</code> replacing <code>id</code> with the value you just got and then try this command again.', {
                parse_mode: "HTML"
            })
        }
    }
})

commands.command('following', async ctx => {
    if (ctx.chat.type === 'private') {
        const message = await ctx.reply("Loading...")
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
            const { total, news, nopes } = await allFollowingData(user as FullUser)
            if (news.length > 0) {
                const path = `New_followings_${user.tgId}.csv`
                const data = news.map(user => ({
                    twId: user.id,
                    name: user.name,
                    username: `@${user.username}`,
                }))
                const headers = [
                    { id: 'twId', title: 'Twitter ID' },
                    { id: 'name', title: 'Name' },
                    { id: 'username', title: 'Twitter handle' },
                ]
                const success = await csvExport(path, data, headers)
                if (success) {
                    await ctx.replyWithDocument(Input.fromLocalFile(path), {
                        caption: 'Accounts that you started following'
                    }).catch(logger.error)
                    await unlink(path)
                }
            }
            if (nopes.length > 0) {
                const path = `No_longer_followings_${user.tgId}.csv`
                const data = nopes.map(user => ({
                    twId: user.twId,
                    name: user.name,
                    username: `@${user.username}`,
                }))
                const headers = [
                    { id: 'twId', title: 'Twitter ID' },
                    { id: 'name', title: 'Name' },
                    { id: 'username', title: 'Twitter handle' },
                ]
                const success = await csvExport(path, data, headers)
                if (success) {
                    await ctx.replyWithDocument(Input.fromLocalFile(path), {
                        caption: 'Accounts that you stopped following'
                    }).catch(logger.error)
                    await unlink(path)
                }
            }
            const text = `You are following ${news.length} new accounts\nYou stopped following ${nopes.length} accounts\n\nTotal: ${total}`
            ctx.telegram.editMessageText(ctx.chat.id, message.message_id, undefined, text, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    Markup.button.callback('Export List', `exportFollowings_${user.tgId}`)
                ])
            }).catch(logger.error)
        } else {
            ctx.reply('It seems like you haven\'t set you Twitter ID. You can use <code>/get username</code>, where <code>username</code> is your Twitter handle, to get your Twitter ID, then use <code>/myid id</code> replacing <code>id</code> with the value you just got and then try this command again.', {
                parse_mode: "HTML"
            })
        }
    }
})