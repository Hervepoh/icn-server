"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNotification = exports.createNotification = exports.getAllNotifications = void 0;
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const node_cron_1 = __importDefault(require("node-cron"));
const sendMail_1 = __importDefault(require("../libs/utils/sendMail"));
const prismadb_1 = __importDefault(require("../libs/prismadb"));
const not_found_1 = __importDefault(require("../exceptions/not-found"));
const http_exception_1 = require("../exceptions/http-exception");
const notifications_1 = require("../schema/notifications");
const bad_requests_1 = __importDefault(require("../exceptions/bad-requests"));
const secrets_1 = require("../secrets");
const log_1 = require("../libs/utils/log");
//---------------------------------------------------------
//              get all notifications -- only for admin
//---------------------------------------------------------
const getAllNotifications = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const notifications = yield prismadb_1.default.notification.findMany({ orderBy: { createdAt: "desc" } });
    res.status(200).json({
        success: true,
        notifications,
    });
});
exports.getAllNotifications = getAllNotifications;
//-----------------------------------------------
//              send notification
//-----------------------------------------------
const createNotification = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const notifications = yield prismadb_1.default.notification.create({
        data: notifications_1.notificationSchema.parse(req.body)
    });
    res.status(201).json({
        success: true,
        notifications,
    });
});
exports.createNotification = createNotification;
//-----------------------------------------------
//              update notifications status
//-----------------------------------------------
const updateNotification = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let id = req.params.id;
    //  const id = idSchema.parse(as string);
    if (!id)
        throw new bad_requests_1.default("Notification not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    id = parseInt(id, 10);
    const notification = yield prismadb_1.default.notification.findUnique({
        where: { id: id },
    });
    if (!notification)
        throw new not_found_1.default("Notification not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    if (notification.status) {
        yield prismadb_1.default.notification.update({
            where: { id: id },
            data: { status: "read" }
        });
    }
    res.status(201).json({
        success: true,
        message: "Notification read successfully",
    });
});
exports.updateNotification = updateNotification;
//-----------------------------------------------
//              delete old notifications -- only for admin
//-----------------------------------------------
node_cron_1.default.schedule('0 0 0 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    const thirtyDayAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    yield prismadb_1.default.notification.deleteMany({
        where: {
            status: "read",
            createdAt: { lt: thirtyDayAgo }
        }
    });
    console.log('----------------------------');
    console.log('Delete read notifications');
    console.log('----------------------------');
}));
//-----------------------------------------------
//              send notifications -- only for admin
//-----------------------------------------------
node_cron_1.default.schedule('* * * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    const notifications = yield prismadb_1.default.notification.findMany({
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
                    supportmail: secrets_1.MAIL_NO_REPLY
                };
                const template = notification.template || "notification.mail.ejs";
                const html = yield ejs_1.default.renderFile(path_1.default.join(__dirname, `../mails/${template}`), data);
                try {
                    yield (0, sendMail_1.default)({
                        email: notification.email,
                        subject: notification.subject,
                        template: template,
                        data,
                    });
                }
                catch (error) {
                    (0, log_1.logErrorToFile)(error);
                    //throw new HttpException(error.message, 500, ErrorCode.INTERNAL_EXCEPTION, null);
                }
                console.log(`Email sent to ${notification.email}`);
            }
            else if (notification.method === 'WHATSAPP') {
                // // Send WhatsApp notification
                // await twilioClient.messages.create({
                //   body: notification.message,
                //   from: 'whatsapp:+14155238886', // Your Twilio WhatsApp number
                //   to: `whatsapp:${notification.phone}`, // recipient's WhatsApp number
                // });
                // console.log(`WhatsApp message sent to ${notification.phone}`);
            }
            else if (notification.method === 'SMS') {
                // // Send SMS notification
                // await twilioClient.messages.create({
                //   body: notification.message,
                //   from: '+1234567890', // Your Twilio SMS number
                //   to: notification.phone, // recipient's phone number
                // });
                // console.log(`SMS sent to ${notification.phone}`);
            }
            // Update notification as sent
            yield prismadb_1.default.notification.update({
                where: { id: notification.id },
                data: {
                    sent: true,
                    sentAt: new Date(), // Set the sent date
                },
            });
        }
        catch (error) {
            (0, log_1.logErrorToFile)(error);
            console.error(`Error sending notification to ${notification.email || notification.phone}:`, error);
        }
        console.log('----------------------------');
        console.log('Sending notifications');
        console.log('----------------------------');
    }
}));
