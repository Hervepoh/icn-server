import fs from 'fs';
import path from 'path';

// Fonction pour écrire dans le fichier de log
export function logErrorToFile(error: string) {
  const logFilePath = path.join(__dirname, '../../../error.log'); // Chemin du fichier de log
  const timestamp = new Date().toISOString(); // Obtenir un timestamp ISO

  // Formater le message d'erreur
  const logMessage = `${timestamp} - ERROR: ${error}\n`;

  // Écrire dans le fichier
  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });
}
