import { NextFunction, Request, Response } from "express";
import ejs from "ejs";
import path from "path";
import bcrypt from "bcrypt";

import { redis } from "../libs/utils/redis";
import prismaClient from "../libs/prismadb";
import sendMail from "../libs/utils/sendMail";
import BadRequestException from "../exceptions/bad-requests";
import UnprocessableException from "../exceptions/validation";
import HttpException, { ErrorCode } from "../exceptions/http-exception";
import { acceptablePasswordPolicy, isAnAcceptablePassword, isValidEmail, isValidPassword, passwordPolicy } from "../libs/utils/validator";
import { MAIL_NO_REPLY, SALT_ROUNDS } from "../secrets";
import { signUpSchema, userRoleSchema } from "../schema/users";
import { NotificationMethod } from "@prisma/client";


const key = 'users';

//-----------------------------------------------------------------------------
//             CREATE
//-----------------------------------------------------------------------------
interface IUser {
    name: string;
    email: string;
    password: string;
    avatar?: string;
    role?: any
}

export const create = async (req: Request, res: Response, next: NextFunction) => {
    // Validate input
    signUpSchema.parse(req.body);

    const { name, email, password, avatar, role } = req.body as IUser;

    if (!isAnAcceptablePassword(password)) {
        throw new BadRequestException(`Invalid Password : ${acceptablePasswordPolicy}`, ErrorCode.INVALID_DATA);
    }

    // Create user
    let user = await prismaClient.user.create({
        data: {
            name,
            email,
            password: await bcrypt.hash(password, parseInt(SALT_ROUNDS || '10')),
        }
    });

    // User notification by mail
    await prismaClient.notification.create({
        data: {
            email: user.email,
            message: `Here are your credentials: **Email**: ${user.email}  **Temporary Password**: ${password}`,
            method: NotificationMethod.EMAIL,
            subject: "Your account has been created successfully.",
            template: "new.mail.ejs",
        },
    });

    res.status(201).json({
        success: true,
        data: user
    });

};


//-----------------------------------------------
//       Get All Users  -- only for admin users
//-----------------------------------------------
export const get =
    async (req: Request, res: Response, next: NextFunction) => {
        const usersJSON = await redis.get("allusers");
        if (usersJSON) {
            const users = JSON.parse(usersJSON);
            res.status(200).json({
                success: true,
                users,
            });
        } else {
            const users = await prismaClient.user.findMany({
                where: { createdAt: 'desc' }
            });
            await redis.set(key, JSON.stringify(users));
            res.status(200).json({
                success: true,
                users,
            });
        }
    };


//-----------------------------------------------
//              get user notifications
//-----------------------------------------------
export const getUserNotification =
    async (req: Request, res: Response, next: NextFunction) => {

        const notifications = await prismaClient.internalNotification
            .findMany(
                { where: { createdAt: "desc" } }
            )

        res.status(200).json({
            success: true,
            notifications,
        });
    };



//---------------------------------------------------------------------
//              Update User role /user/role -- only for admin users
//---------------------------------------------------------------------

interface IUpdateUserRoleRequest {
    userId: string;
    roleId: string;
}

export const addUserRole =
    async (req: Request, res: Response, next: NextFunction) => {
        const parsedData = userRoleSchema.parse(req.body as IUpdateUserRoleRequest);
        if (!parsedData) throw new BadRequestException("Invalid data provided please ckeck the documentation", ErrorCode.INVALID_DATA);
        const redis_roles = await redis.get('roles');
        const data = JSON.parse(redis_roles || '');
        console.log('data', data);


        // const validRoles: string[] = ["admin", "teacher", ;
        // if (!validRoles.includes(role)) {
        //   return next(new ErrorHandler("Invalid 'role'", 400));
        // }

        // const user = await userModel.findById(userId);

        // if (!user) {
        //   return next(new ErrorHandler("User not found", 404));
        // }

        // updateUserRoleService(res, userId, role);

    };

export const removeUserRole =
    async (req: Request, res: Response, next: NextFunction) => {
        const { userId, roleId } = req.body as IUpdateUserRoleRequest;
        if (!userId || !roleId) throw new BadRequestException("Invalid data provided please ckeck the documentation", ErrorCode.INVALID_DATA);

        const redis_roles = await redis.get('roles');
        const data = JSON.parse(redis_roles || '');
        console.log('data', data);


        // const validRoles: string[] = ["admin", "teacher", ;
        // if (!validRoles.includes(role)) {
        //   return next(new ErrorHandler("Invalid 'role'", 400));
        // }

        // const user = await userModel.findById(userId);

        // if (!user) {
        //   return next(new ErrorHandler("User not found", 404));
        // }

        // updateUserRoleService(res, userId, role);

    };