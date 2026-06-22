import { generateService } from "@umijs/openapi";

generateService({
    requestLibPath: "import request from '@/libs/request'",
    schemaPath: "http://localhost:8080/v3/api-docs",//替换为自己的接口地址
    serversPath: "./src",//替换为自己的目录
});
