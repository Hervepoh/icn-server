"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logErrorToFile = logErrorToFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Fonction pour écrire dans le fichier de log
function logErrorToFile(error) {
    const logFilePath = path_1.default.join(__dirname, '../../../error.log'); // Chemin du fichier de log
    const timestamp = new Date().toISOString(); // Obtenir un timestamp ISO
    // Formater le message d'erreur
    const logMessage = `${timestamp} - ERROR: ${error}\n`;
    // Écrire dans le fichier
    fs_1.default.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
}
