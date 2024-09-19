import { NextFunction, Request, Response } from "express";
import prismaClient from "./prismadb";
import UnauthorizedException from "../exceptions/unauthorized";
import { ErrorCode } from "../exceptions/http-exception";


export const getUserConnected = async (req: Request) => {
    const user = await prismaClient.user.findFirst({
        where: { id: req.user?.id },
    });
    if (!user) throw new UnauthorizedException("Unauthorize ressource", ErrorCode.UNAUTHORIZE);

    return user;
};