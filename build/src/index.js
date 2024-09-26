"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const secrets_1 = require("./secrets");
const routes_1 = __importDefault(require("./routes"));
const error_1 = require("./middlewares/error");
const socketServer_1 = require("./libs/socketServer");
const app = (0, express_1.default)();
// Configure express behind a reverse proxy Express will trust the X-Forwarded-For and X-Forwarded-Proto headers
app.set('trust proxy', true);
// body parser
app.use(express_1.default.json({ limit: "50mb" }));
// cookie parser
app.use((0, cookie_parser_1.default)());
// cors => cross origin resource sharing
// array of allow domain declare in .env
const origin = secrets_1.NODE_ORIGIN.split(";");
app.use((0, cors_1.default)({
    origin: origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
    credentials: true,
}));
app.use('/api/v1', routes_1.default);
// unknow route
app.all("*", (req, res, next) => {
    const err = new Error(`Route ${req.originalUrl} not found`);
    err.statusCode = 404;
    next(err);
});
// Capture Error
app.use(error_1.ErrorMiddleware);
// Create server
const server = http_1.default.createServer(app);
// initSocketServer
(0, socketServer_1.initSocketServer)(server);
server.listen(process.env.NODE_PORT, () => {
    console.log(`Server is connected with port ${process.env.NODE_PORT}`);
});
// app.listen(PORT, () => {
//     console.log(`Server is connected with port ${PORT}`);
// });
