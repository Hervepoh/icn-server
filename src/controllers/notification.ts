import { NextFunction, Request, Response } from "express";
import ejs from "ejs";
import path from "path";
import cron from "node-cron";

import sendMail from "../libs/utils/sendMail";
import prismaClient from "../libs/prismadb";
import NotFoundException from "../exceptions/not-found";
import HttpException, { ErrorCode } from "../exceptions/http-exception";
import { idSchema, notificationSchema } from "../schema/notifications";
import BadRequestException from "../exceptions/bad-requests";
import { MAIL_NO_REPLY } from "../secrets";
import { writeLogEntry } from "../libs/utils/log";

//---------------------------------------------------------
//              get all notifications -- only for admin
//---------------------------------------------------------
export const getAllNotifications =
  async (req: Request, res: Response, next: NextFunction) => {

    const notifications = await prismaClient.notification.findMany({ orderBy: { createdAt: "desc" } });

    res.status(200).json({
      success: true,
      notifications,
    });
  };

//-----------------------------------------------
//              send notification
//-----------------------------------------------
export const createNotification =
  async (req: Request, res: Response, next: NextFunction) => {
    const notifications = await prismaClient.notification.create({
      data: notificationSchema.parse(req.body)
    });

    res.status(201).json({
      success: true,
      notifications,
    });
  };

//-----------------------------------------------
//              update notifications status
//-----------------------------------------------
export const updateNotification =
  async (req: Request, res: Response, next: NextFunction) => {
    let id: string | number = req.params.id
    //  const id = idSchema.parse(as string);
    if (!id) throw new BadRequestException("Notification not found", ErrorCode.RESSOURCE_NOT_FOUND);

    id = parseInt(id, 10);

    const notification = await prismaClient.notification.findUnique({
      where: { id: id },
    });

    if (!notification) throw new NotFoundException("Notification not found", ErrorCode.RESSOURCE_NOT_FOUND);

    if (notification.status) {
      await prismaClient.notification.update({
        where: { id: id },
        data: { status: "read" }
      });
    }

    res.status(201).json({
      success: true,
      message: "Notification read successfully",
    });
  };

//-----------------------------------------------
//              delete old notifications -- only for admin
//-----------------------------------------------
cron.schedule('0 0 0 * * *', async () => {
  const thirtyDayAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prismaClient.notification.deleteMany({
    where: {
      status: "read",
      createdAt: { lt: thirtyDayAgo }
    }
  });
  console.log('----------------------------');
  console.log('Delete read notifications');
  console.log('----------------------------');

});


//-----------------------------------------------
//              send notifications -- only for admin
//-----------------------------------------------
cron.schedule('* * * * *', async () => {
  const notifications = await prismaClient.notification.findMany({
    where: {
      sent: false,
    },
  });

  for (const notification of notifications) {
    try {
      let isSend = false;
      if (notification.method === 'EMAIL' && notification.email) {
        // Send email notification
        const data = {
          user: { name: notification.email },
          from: `ICN CASHING`,
          text: notification.message,
          supportmail: MAIL_NO_REPLY
        };
        const template = notification.template || "notification.mail.ejs"

        const html = await ejs.renderFile(
          path.join(__dirname, `../mails/${template}`),
          data
        );

        try {
          await sendMail({
            email: notification.email,
            subject: notification.subject,
            template: template,
            data,
          });
        } catch (error: any) {
          writeLogEntry(error);
          //throw new HttpException(error.message, 500, ErrorCode.INTERNAL_EXCEPTION, null);
        }
             
        console.log(`Email sent to ${notification.email}`);
      } else if (notification.method === 'WHATSAPP') {
        // // Send WhatsApp notification
        // await twilioClient.messages.create({
        //   body: notification.message,
        //   from: 'whatsapp:+14155238886', // Your Twilio WhatsApp number
        //   to: `whatsapp:${notification.phone}`, // recipient's WhatsApp number
        // });
        // console.log(`WhatsApp message sent to ${notification.phone}`);
      } else if (notification.method === 'SMS') {
        // // Send SMS notification
        // await twilioClient.messages.create({
        //   body: notification.message,
        //   from: '+1234567890', // Your Twilio SMS number
        //   to: notification.phone, // recipient's phone number
        // });
        // console.log(`SMS sent to ${notification.phone}`);
      }
       // Update notification as sent
       await prismaClient.notification.update({
        where: { id: notification.id },
        data: {
          sent: true,
          sentAt: new Date(), // Set the sent date
        },
      });
    } catch (error: any) {
      writeLogEntry(error);
      console.error(`Error sending notification to ${notification.email || notification.phone}:`, error);
    }
    console.log('----------------------------');
    console.log('Sending notifications');
    console.log('----------------------------');

  }

});


