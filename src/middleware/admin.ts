import { Composer, Markup, Input } from "telegraf";
import { prisma } from "../db/prisma.js";
import { logger } from "../logger/index.js";
import { ADMIN_ID } from "../config/index.js";

export const admin = new Composer()

admin.command('add', Composer.acl(parseInt(ADMIN_ID), async ctx => {
    const tgId = ctx.message.text.replace(/^\/add\s+/i, '').trim()
    await prisma.user.upsert({
        where: {
            tgId,
        },
        update: {},
        create: {
            tgId,
        }
    })
        .then(() => ctx.reply('User added'))
        .catch(() => ctx.reply('Error with prisma call'))
}))