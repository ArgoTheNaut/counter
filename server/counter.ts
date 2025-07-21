import { IncomingMessage, ServerResponse } from "http";
import { oPermissions } from 'Permissions';
import { StatusCodes } from "statusCodes";
import { Database } from "database";

module.exports = {
    description: "Record clicks and report on daily clicks stored in the counter table",
    enabled: true,

    async get(req: IncomingMessage, res: ServerResponse<IncomingMessage>, permissions: oPermissions) {
        // handled by after() method
    },

    async post(req: IncomingMessage, res: ServerResponse<IncomingMessage>, permissions: oPermissions) {
        await Database.recordFnbNovaClick(
            permissions.username,
            req.headers['x-forwarded-for'] as string || "unknown",
            req.headers['sentTime'] as string || new Date(),
            req.headers['category'] as string || "food", // default category name is food
        );
    },

    async put(req: IncomingMessage, res: ServerResponse<IncomingMessage>, permissions: oPermissions) {
        res.statusCode = StatusCodes.MethodNotAllowed;
    },

    async delete(req: IncomingMessage, res: ServerResponse<IncomingMessage>, permissions: oPermissions) {
        let category = req.headers['category'] as string || "food"; // default category name is food
        await Database.undoFnbNovaClick(category, permissions.username);
    },

    async before(req: IncomingMessage, res: ServerResponse<IncomingMessage>, permissions: oPermissions) {
        res.setHeader("content-type", "text/json");
    },

    async after(req, res: ServerResponse<IncomingMessage>, permissions: oPermissions) {
        let clicks = await Database.getFnbNovaClicks(req.queryValues, permissions.username);
        res.write(JSON.stringify(clicks.rows));
    },
}
