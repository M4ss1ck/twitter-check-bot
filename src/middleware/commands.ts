import { Composer } from "telegraf";
import { prisma } from "../db/prisma.js";
import { logger } from "../logger/index.js";
import { getUserByUsername } from "../utils/twitter.js";

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

// myid command