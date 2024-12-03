import { NextFunction, Request, Response } from 'express';

import { redis } from '../libs/utils/redis';
import prismaClient from '../libs/prismadb';
import { ErrorCode } from '../exceptions/http-exception';
import NotFoundException from '../exceptions/not-found';
import UnprocessableException from '../exceptions/validation';

import { schema, bulkCreateSchema, bulkDeleteSchema } from '../schema/unit';
import BadRequestException from '../exceptions/bad-requests';

const key = 'units';

//-----------------------------------------------------------------------------
//             CREATE : post /units
//-----------------------------------------------------------------------------
interface IRequest {
    name: string;
}

// Handling create unit process
export const create =
    async (req: Request, res: Response, next: NextFunction) => {
        // Validate input
        const parsed = schema.parse(req.body as IRequest);

        const isAlready = await prismaClient.unit.findFirst({ where: { name: parsed.name } });
        if (isAlready) {
            throw new UnprocessableException(null, "Duplicate name", ErrorCode.RESSOURCE_ALREADY_EXISTS);
        }

        const data = await prismaClient.unit.create({
            data: parsed,
        });

        revalidateService(key);

        res.status(201).json({
            success: true,
            data
        });
    };


//-----------------------------------------------------------------------------
//             GET ALL :  get /units
//-----------------------------------------------------------------------------

// Handling the process GET units 
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
//             GET BY ID : get /units/:id
//-----------------------------------------------------------------------------

// Handling the process GET unit by ID 
export const getById =
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA);

        const data = await prismaClient.unit.findUnique({
            where: { id: id },
        });
        if (!data) throw new NotFoundException("Item not found", ErrorCode.RESSOURCE_NOT_FOUND);

        res.status(200).json({
            success: true,
            data
        });

    };

//-----------------------------------------------------------------------------
//             UPDATE : put  /units/:id
//-----------------------------------------------------------------------------

// Handling Update unit process
export const update =
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA);

        const parsed = schema.parse(req.body); // Validate input

        const data = await prismaClient.unit.update({
            where: { id: id },
            data: parsed,
        });

        revalidateService(key);

        res.status(200).json({
            success: true,
            data
        });

    };


//-----------------------------------------------------------------------------
//             DELETE : delete  /units/:id
//-----------------------------------------------------------------------------

// Handling delete unit process
export const remove =
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA);

        await prismaClient.unit.delete({
            where: { id: id },
        });

        revalidateService(key);

        res.status(204).send(); // No content

    };


//-----------------------------------------------------------------------------
//             BULK-CREATE : post /units
//-----------------------------------------------------------------------------

// IBulkCreateRequest interface definition
interface IBulkCreateRequest {
    data: { name: string }[];
}

// Handling create unit process
export const bulkCreate = async (req: Request, res: Response, next: NextFunction) => {

    // Validate input
    const parsedData = bulkCreateSchema.parse(req.body as IBulkCreateRequest);

    // Check for duplicate unit names
    const existingRessources = await Promise.all(parsedData.data.map(async item => {
        return await prismaClient.unit.findFirst({ where: { name: item.name } });
    }));

    const duplicates = existingRessources.filter(item => item);
    if (duplicates.length > 0) {
        return res.status(422).json({
            success: false,
            message: "Duplicate name found",
            duplicates: duplicates.map(item => item?.name)
        });
    }

    // Create units
    const createdPaymentModes = await Promise.all(parsedData.data.map(unit =>
        prismaClient.unit.create({ data: unit })
    ));

    revalidateService(key);

    res.status(201).json({
        success: true,
        data: createdPaymentModes
    });

};

//-----------------------------------------------------------------------------
//             BULK-DELETE : delete  /units/:id
//-----------------------------------------------------------------------------

// IBulkCreateRequest
interface IBulkDeleteRequest {
    data: { id: string }[];
}

// Handling bulk delete unit process
export const bulkRemove = async (req: Request, res: Response, next: NextFunction) => {

    // Validate input using Zod
    const { ids } = bulkDeleteSchema.parse(req.body);

    // Perform bulk delete
    const deleteResult = await prismaClient.unit.deleteMany({
        where: {
            id: { in: ids } // Use 'in' to delete all matching IDs in one query
        }
    });

    revalidateService(key);

    // Send response
    res.status(204).send(); // No content

};

const revalidateService = async (key: string) => {

    const data = await prismaClient.unit.findMany({
        select: {
            id: true,
            name: true,
            createdAt: true,
            region: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    // flatten the structure
    const formattedData = data.map(unit => ({
        id: unit.id,
        name: unit.name,
        createdAt: unit.createdAt,
        regionId: unit.region ? unit.region.id : null, 
        region: unit.region ? unit.region.name : null, 
    }));
    
    await redis.set(key, JSON.stringify(formattedData));
    
    return data
}