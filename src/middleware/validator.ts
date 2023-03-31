import { Composer } from "telegraf";
import { prisma } from "../db/prisma.js";
import { ADMIN_ID } from "../config/index.js";

export const validator = new Composer()

validator.use(async (ctx, next) => {
    if (ctx.from && ctx.chat?.type === "private") {
        const tgId = ctx.from.id.toString()
        const currentUser = await prisma.user.findUnique({
            where: {
                tgId,
            }
        })
        if (!currentUser) {
            return ctx.reply(`You are not allowed to use this bot, contact <a href="tg://user?id=${ADMIN_ID}">my owner</a>.`, {
                parse_mode: "HTML"
            })
        }
        await next()
    }
})