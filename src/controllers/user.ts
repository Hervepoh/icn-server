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
import { idSchema, signUpSchema, updateSchema, userRoleSchema } from "../schema/users";
import { NotificationMethod } from "@prisma/client";
import NotFoundException from "../exceptions/not-found";


const key = 'users';

//-----------------------------------------------------------------------------
//             CREATE USERS : post /users
//-----------------------------------------------------------------------------
interface IUser {
    name: string;
    email: string;
    password: string;
    ldap? : boolean;
    avatar?: string;
    roleId?: any
}

// Handling create user process
export const create = async (req: Request, res: Response, next: NextFunction) => {
    // Validate input
    signUpSchema.parse(req.body);

    const { name, email, password, roleId ,ldap } = req.body as IUser;

    if (!isAnAcceptablePassword(password)) {
        throw new BadRequestException(`Invalid Password : ${acceptablePasswordPolicy}`, ErrorCode.INVALID_DATA);
    }

    // Create user
    const user = await prismaClient.user.create({
        data: {
            name,
            email,
            password: await bcrypt.hash(password, parseInt(SALT_ROUNDS || '10')),
            ldap
        }
    });
    let role;
    if (!roleId) {
        // default role
        role = await prismaClient.role.findFirst({
            where: { name: "USER" }
        });
    } else {
        role = await prismaClient.role.findUnique({
            where: { id: roleId }
        });
    }
    if (!role) throw new BadRequestException(`Something went wrong`, ErrorCode.INVALID_DATA);

    // Assign default role
    await prismaClient.userRole.create({
        data: {
            userId: user.id,
            roleId: role.id,
        }
    });
     
    const message = ldap 
    ? `**Email**: ${user.email} \n\n Please use your Outlook password to log in.`
    : `**Email**: ${user.email} \n\n  **Temporary Password**: ${password}.`;

    // User notification by mail
    await prismaClient.notification.create({
        data: {
            email: user.email,
            message: message ,
            method: NotificationMethod.EMAIL,
            subject: "Your account has been created successfully.",
            template: "new.mail.ejs",
        },
    });
    revalidateService(key);
    revalideCommercialListService(key);

    res.status(201).json({
        success: true,
        data: user
    });

};


//-----------------------------------------------
//       Get All Users : get users
//-----------------------------------------------

// Handling the process GET users information 
export const get =
    async (req: Request, res: Response, next: NextFunction) => {
        const usersJSON = await redis.get(key);
        if (usersJSON) {
            const data = JSON.parse(usersJSON);
            res.status(200).json({
                success: true,
                data,
            });
        } else {
            const data = await revalidateService(key);

            res.status(200).json({
                success: true,
                data,
            });
        }
    };

//-----------------------------------------------
//       Get All Users : get users
//-----------------------------------------------

// Handling the process GET users information 
export const getPublic =
async (req: Request, res: Response, next: NextFunction) => {
    const public_key = key+'_public'
    const usersJSON = await redis.get(public_key);
    if (usersJSON) {
        const data = JSON.parse(usersJSON);
        res.status(200).json({
            success: true,
            data,
        });
    } else {
        const data = await revalidePublicistService(public_key);

        res.status(200).json({
            success: true,
            data,
        });
    }
};

//-----------------------------------------------
//       Get All Users : get users
//-----------------------------------------------

// Handling the process GET users information 
export const getCommercialUsers =
    async (req: Request, res: Response, next: NextFunction) => {
        const usersJSON = await redis.get(key+'_role_commercial');
        if (usersJSON) {
            const data = JSON.parse(usersJSON);
            res.status(200).json({
                success: true,
                data,
            });
        } else {
            const data = await revalideCommercialListService(key);
            res.status(200).json({
                success: true,
                data,
            });
        }
    };


//-----------------------------------------------------------------------------
//             GET USER BY ID : get /users/:id
//-----------------------------------------------------------------------------

// Handling the process GET user by ID 
export const getById =
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA)

        const data = await prismaClient.user.findUnique({
            where: { id: id },
        });
        if (!data) throw new NotFoundException("User not found", ErrorCode.RESSOURCE_NOT_FOUND);

        res.status(200).json({
            success: true,
            data: data
        });

    };


//-----------------------------------------------------------------------------
//             UPDATE USER : put  /users/:id
//-----------------------------------------------------------------------------

// Handling  user udpdate process
export const update =
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA)
        if (!idSchema.parse(id)) throw new BadRequestException('Invalid ID format', ErrorCode.INVALID_DATA)

        const parsedInput = updateSchema.parse(req.body); // Validate input
        const data = await prismaClient.user.update({
            where: { id: id },
            data: parsedInput,
        });
        revalidateService(key);
        revalideCommercialListService(key);

        res.status(200).json({
            success: true,
            data: data
        });

    };


//-----------------------------------------------------------------------------
//             DELETE USER : delete  /users/:id
//-----------------------------------------------------------------------------

// Handling delete user process
export const remove =
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA)
        if (!idSchema.parse(id)) throw new BadRequestException('Invalid ID format', ErrorCode.INVALID_DATA)

        await prismaClient.userRole.deleteMany({
            where: { userId: id }
        });

        await prismaClient.user.delete({
            where: { id: id }
        });
        revalidateService(key);
        revalideCommercialListService(key);

        res.status(204).send(); // No content

    };


//-----------------------------------------------
//              get user notifications
//-----------------------------------------------
export const getUserNotification =
    async (req: Request, res: Response, next: NextFunction) => {

        console.log("user",req.user);
        if (!req.user?.id) {
            throw new BadRequestException('Please first login if you want to achieve this action', ErrorCode.INVALID_DATA)
        }
      

        const notifications = await prismaClient.notification
            .findMany(
                {
                    where: {
                        userId: req.user.id, // Récupérer les notifications pour l'utilisateur spécifique
                        NOT: {
                            userId: null, // Exclure les notifications où userId est null
                        },
                    },
                }
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


        // const validRoles: string[] = ["admin", "teacher", ;
        // if (!validRoles.includes(role)) {
        //   return next(new ErrorHandler("Invalid 'role'", 400));
        // }

        // const user = await userModel.findById(userId);

        // if (!user) {
        //   return next(new ErrorHandler("User not found", 404));
        // }

        // updateUserRoleService(res, userId, role);
        revalidateService(key);
        revalideCommercialListService(key);

    };

export const removeUserRole =
    async (req: Request, res: Response, next: NextFunction) => {
        const { userId, roleId } = req.body as IUpdateUserRoleRequest;
        if (!userId || !roleId) throw new BadRequestException("Invalid data provided please ckeck the documentation", ErrorCode.INVALID_DATA);

        const redis_roles = await redis.get('roles');
        const data = JSON.parse(redis_roles || '');

        // const validRoles: string[] = ["admin", "teacher", ;
        // if (!validRoles.includes(role)) {
        //   return next(new ErrorHandler("Invalid 'role'", 400));
        // }

        // const user = await userModel.findById(userId);

        // if (!user) {
        //   return next(new ErrorHandler("User not found", 404));
        // }

        // updateUserRoleService(res, userId, role);
        revalidateService(key);
        revalideCommercialListService(key);

    };


const revalidateService = async (key: string) => {
    const data = await prismaClient.user.findMany({
        orderBy: {
            createdAt: 'desc',
        },
    });
    await redis.set(key, JSON.stringify(data));
    return data
}

const revalideCommercialListService = async (key: string) => {
    const data = await prismaClient.user.findMany({
        where: {
            roles: {
                some: {
                    role: {
                        name: 'COMMERCIAL', 
                    },
                },
            },
        },
        select: {
            id: true,
            name: true,
            email: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    await redis.set(key+'_role_commercial', JSON.stringify(data));
    return data
}

const revalidePublicistService = async (key: string) => {
    const data = await prismaClient.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    await redis.set(key, JSON.stringify(data));
    return data
}