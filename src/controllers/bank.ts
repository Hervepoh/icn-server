import { NextFunction, Request, Response } from 'express';

import { redis } from '../libs/utils/redis';
import prismaClient from '../libs/prismadb';
import NotFoundException from '../exceptions/not-found';
import { ErrorCode } from '../exceptions/http-exception';
import UnprocessableException from '../exceptions/validation';

import { bankSchema, bulkCreateSchema, bulkDeleteSchema } from '../schema/banks';
import BadRequestException from '../exceptions/bad-requests';

const key = 'banks';

//-----------------------------------------------------------------------------
//             CREATE BANK : post /banks
//-----------------------------------------------------------------------------

// IBankRequest
interface IBankRequest {
    name: string;
}

// Handling create bank process
export const create =
    async (req: Request, res: Response, next: NextFunction) => {
        // Validate input
        const parsedBank = bankSchema.parse(req.body as IBankRequest);
        // search if the name already exists
        const isAlready = await prismaClient.bank.findFirst({ where: { name: parsedBank.name } });
        if (isAlready) {
            throw new UnprocessableException(null, "Duplicate setting name", ErrorCode.RESSOURCE_ALREADY_EXISTS);
        }
        const data = await prismaClient.bank.create({
            data: parsedBank,
        });
        revalidateService(key);

        res.status(201).json({
            success: true,
            data
        });
    };


//-----------------------------------------------------------------------------
//             GET ALL BANK :  get /banks
//-----------------------------------------------------------------------------

// Handling the process GET banks 
export const get =
    async (req: Request, res: Response, next: NextFunction) => {
        let data;
        const redis_data = await redis.get(key);
        if (redis_data) {
            data = JSON.parse(redis_data);
        } else {
            data = await revalidateService(key);
        }

        res.status(200).json({
            success: true,
            data
        });
    }


//-----------------------------------------------------------------------------
//             GET BANK BY ID : get /banks/:id
//-----------------------------------------------------------------------------

// Handling the process GET bank by ID 
export const getById =
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA);

        const data = await prismaClient.bank.findUnique({
            where: { id: id },
        });
        if (!data) throw new NotFoundException("Bank not found", ErrorCode.RESSOURCE_NOT_FOUND);

        res.status(200).json({
            success: true,
            data
        });

    };

//-----------------------------------------------------------------------------
//             UPDATE BANK : put  /banks/:id
//-----------------------------------------------------------------------------

// Handling Update bank process
export const update =
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA);

        const parsedBank = bankSchema.parse(req.body); // Validate input
        const data = await prismaClient.bank.update({
            where: { id: id },
            data: parsedBank,
        });
        revalidateService(key);

        res.status(200).json({
            success: true,
            data
        });

    };


//-----------------------------------------------------------------------------
//             DELETE BANK : delete  /banks/:id
//-----------------------------------------------------------------------------

// Handling delete bank process
export const remove =
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA);
        
        await prismaClient.bank.delete({
            where: { id: id },
        });
        revalidateService(key);

        res.status(204).send(); // No content

    };


//-----------------------------------------------------------------------------
//             BULK-CREATE BANK : post /banks
//-----------------------------------------------------------------------------

// IBulkCreateRequest interface definition
interface IBulkCreateRequest {
    data: { name: string }[];
}

// Handling create bank process
export const bulkCreate = async (req: Request, res: Response, next: NextFunction) => {

    // Validate input
    const parsedData = bulkCreateSchema.parse(req.body as IBulkCreateRequest);

    // Check for duplicate bank names
    const existingRessources = await Promise.all(parsedData.data.map(async item => {
        return await prismaClient.bank.findFirst({ where: { name: item.name } });
    }));

    const duplicates = existingRessources.filter(item => item);
    if (duplicates.length > 0) {
        return res.status(422).json({
            success: false,
            message: "Duplicate setting names found",
            duplicates: duplicates.map(item => item?.name)
        });
    }

    // Create banks
    const createdBanks = await Promise.all(parsedData.data.map(bank =>
        prismaClient.bank.create({ data: bank })
    ));

    revalidateService(key);

    res.status(201).json({
        success: true,
        data: createdBanks
    });

};

//-----------------------------------------------------------------------------
//             BULK-DELETE BANK : delete  /banks/:id
//-----------------------------------------------------------------------------

// IBulkCreateRequest
interface IBulkDeleteRequest {
    data: { id: string }[];
}

// Handling bulk delete bank process
export const bulkRemove = async (req: Request, res: Response, next: NextFunction) => {

    // Validate input using Zod
    const { ids } = bulkDeleteSchema.parse(req.body);

    // Perform bulk delete
    const deleteResult = await prismaClient.bank.deleteMany({
        where: {
            id: { in: ids } // Use 'in' to delete all matching IDs in one query
        }
    });

    revalidateService(key);

    // Send response
    res.status(204).send(); // No content

};

const revalidateService = async (key: string) => {
    const data = await prismaClient.bank.findMany({
        orderBy: {
            createdAt: 'desc',
        },
    });
    await redis.set(key, JSON.stringify(data));
    return data
}