"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogType = exports.LogLevel = void 0;
exports.writeLogEntry = writeLogEntry;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Énumération pour les niveaux de log
var LogLevel;
(function (LogLevel) {
    LogLevel["INFO"] = "INFO";
    LogLevel["WARNING"] = "WARNING";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// Énumération pour les types d'erreur
var LogType;
(function (LogType) {
    LogType["VALIDATION"] = "VALIDATION";
    LogType["DATABASE"] = "DATABASE";
    LogType["NETWORK"] = "NETWORK";
    LogType["AUTHENTICATION"] = "AUTHENTICATION";
    LogType["AUTHORIZATION"] = "AUTHORIZATION";
    LogType["GENERAL"] = "GENERAL";
})(LogType || (exports.LogType = LogType = {}));
// Fonction pour écrire dans le fichier de log
function writeLogEntry(message, level = LogLevel.ERROR, type = LogType.GENERAL, errors) {
    const logDir = path_1.default.join(__dirname, '../../../logs'); // Répertoire des logs
    const today = new Date().toISOString().split('T')[0]; // Obtenir la date au format YYYY-MM-DD
    const logFilePath = path_1.default.join(logDir, `log-${today}.log`); // Chemin du fichier de log quotidien
    // Créer le répertoire s'il n'existe pas
    if (!fs_1.default.existsSync(logDir)) {
        fs_1.default.mkdirSync(logDir, { recursive: true });
    }
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    // Formater le message d'erreur
    let logMessage = `${timestamp} - ${level} - ${type}: ${message}\n`;
    // Ajouter des informations supplémentaires si elles existent
    if (errors) {
        logMessage += `Additional Info: ${JSON.stringify(errors)}\n`;
    }
    // Vérifier si le fichier du jour existe déjà
    fs_1.default.access(logFilePath, fs_1.default.constants.F_OK, (err) => {
        if (err) {
            // Le fichier n'existe pas, on peut le créer
            fs_1.default.writeFile(logFilePath, logMessage, (writeErr) => {
                if (writeErr) {
                    console.error('Failed to create log file:', writeErr);
                }
            });
        }
        else {
            // Le fichier existe, on l'append
            fs_1.default.appendFile(logFilePath, logMessage, (appendErr) => {
                if (appendErr) {
                    console.error('Failed to write to log file:', appendErr);
                }
            });
        }
    });
}
