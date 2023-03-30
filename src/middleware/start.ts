import { Composer } from "telegraf";
import { prisma } from "../db/prisma.js";
import { ADMIN_ID } from "../config/index.js";

export const start = new Composer()

start.start(async ctx => {
    ctx.reply("With this bot you will be able to track your twitter followers and more.")
})