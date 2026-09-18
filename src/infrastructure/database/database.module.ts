import { Global, Module } from "@nestjs/common";

import { PrismaAdapter } from "./adapters/prisma.adapter.js";

@Global()
@Module({
    providers: [PrismaAdapter],
    exports: [PrismaAdapter],
})
export class DatabaseModule {}
