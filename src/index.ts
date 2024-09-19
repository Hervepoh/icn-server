import express, { Express, NextFunction, Request, Response } from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { NODE_ORIGIN, PORT } from "./secrets";
import rootRouter from "./routes";
import { ErrorMiddleware } from "./middlewares/error";
import { initSocketServer } from "./libs/socketServer";

const app: Express = express();

// Configure express behind a reverse proxy Express will trust the X-Forwarded-For and X-Forwarded-Proto headers
app.set('trust proxy', true);

// body parser
app.use(express.json({ limit: "50mb" }));

// cookie parser
app.use(cookieParser());

// cors => cross origin resource sharing
// array of allow domain declare in .env
const origin = NODE_ORIGIN.split(";");
app.use(
  cors({
    origin: origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
    credentials: true,
  })
);


app.use('/api/v1', rootRouter);

// unknow route
app.all("*", (req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err);
});

// Capture Error
app.use(ErrorMiddleware);


// Create server
const server = http.createServer(app);

// initSocketServer
initSocketServer(server);

server.listen(process.env.NODE_PORT, () => {
    console.log(`Server is connected with port ${process.env.NODE_PORT}`);
})

// app.listen(PORT, () => {
//     console.log("App working...");
//     console.log(`Server is connected with port ${PORT}`);
// });