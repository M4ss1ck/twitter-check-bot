import { Telegraf } from "telegraf";
import { logger } from "./logger/index.js";
import { TOKEN } from "./config/index.js";
import { validator } from "./middleware/validator.js";
import { start } from "./middleware/start.js";
import { commands } from "./middleware/commands.js";
import { actions } from "./middleware/actions.js";

const bot = new Telegraf(TOKEN);

bot.command('test', ctx => {
    ctx.reply('tested', { reply_to_message_id: ctx.message?.message_id })
})

bot
    .use(validator)
    .use(start)
    .use(commands)
    .use(actions)

bot.launch()
logger.success('BOT INICIADO')

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))