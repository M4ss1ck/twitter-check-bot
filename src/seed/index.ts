import { PrismaClient } from "@prisma/client";
import { logger } from "../logger/index.js";
import { ADMIN_ID, TWITTER_ID } from "../config/index.js";

const prisma = new PrismaClient();

const seed = async () => {
    await prisma.user.upsert({
        where: {
            tgId: ADMIN_ID
        },
        update: {},
        create: {
            tgId: ADMIN_ID,
            twId: TWITTER_ID,
            name: "Admin"
        }
    }).then(res => logger.info(res))

}

seed()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });  