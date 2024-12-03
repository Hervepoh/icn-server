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
Object.defineProperty(exports, "__esModule", { value: true });
const db_config_1 = require("../../config/db.config");
const log_1 = require("./log");
var oracledb = require('oracledb');
function getConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield oracledb.createPool(db_config_1.dbConfig, (err) => {
                if (err) {
                    (0, log_1.writeLogEntry)(`Oracle connection pool creation error`, log_1.LogLevel.ERROR, log_1.LogType.DATABASE, ["error", err]);
                    return;
                }
                (0, log_1.writeLogEntry)(`Oracle connection pool successfully created.`, log_1.LogLevel.INFO, log_1.LogType.DATABASE, ["error", err]);
            });
            return yield oracledb.getConnection();
        }
        catch (err) {
            (0, log_1.writeLogEntry)(`Error obtaining an Oracle connection`, log_1.LogLevel.ERROR, log_1.LogType.DATABASE, ["error", err]);
            throw err;
        }
    });
}
function executeQuery(connection, query, values) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield connection.execute(query);
        }
        catch (err) {
            (0, log_1.writeLogEntry)(`Error during query execution`, log_1.LogLevel.ERROR, log_1.LogType.DATABASE, ["query", query, "error", err]);
            throw err;
        }
        finally {
            try {
                yield connection.close();
            }
            catch (error) {
                (0, log_1.writeLogEntry)(`Database closing connection error`, log_1.LogLevel.ERROR, log_1.LogType.DATABASE, ["query", query, "error", error]);
            }
        }
    });
}
// Function to close database pool 
function releaseConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield oracledb.getPool().close(0);
        }
        catch (err) {
            (0, log_1.writeLogEntry)(`Error closing connection pool`, log_1.LogLevel.ERROR, log_1.LogType.DATABASE, ["error", err]);
            throw err;
        }
    });
}
function run(query, values) {
    return __awaiter(this, void 0, void 0, function* () {
        let connection;
        try {
            const connection = yield getConnection();
            let query = '';
            let values = [];
            yield executeQuery(connection, query, values);
        }
        catch (err) {
            (0, log_1.writeLogEntry)(`Error in run function :`, log_1.LogLevel.ERROR, log_1.LogType.DATABASE, ["error", err, "query", query, "values", values]);
        }
        finally {
            if (connection) {
                yield releaseConnection();
            }
        }
    });
}
