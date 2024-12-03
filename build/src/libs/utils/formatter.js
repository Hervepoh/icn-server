"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatReference = exports.parseDMY = exports.getCurrentMonthYear = exports.formatDate = void 0;
exports.isEmpty = isEmpty;
exports.formatDateRange = formatDateRange;
exports.isSameYear = isSameYear;
const date_fns_1 = require("date-fns");
function isEmpty(variable) {
    if (variable === null || variable === undefined || variable === '') {
        return true;
    }
    return false;
}
const formatDate = (value) => {
    const date = new Date(value);
    const month = date.getMonth() + 1; // Add 1 because month values are zero-based
    const day = date.getDate();
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    return (formattedDate);
};
exports.formatDate = formatDate;
// Function to get the date in the format "MMYY"
const getCurrentMonthYear = (value) => {
    const currentDate = new Date(value);
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const year = String(currentDate.getFullYear()).slice(2);
    return `${month}${year}`;
};
exports.getCurrentMonthYear = getCurrentMonthYear;
const parseDMY = (s) => {
    let [d, m, y] = s.split(/\D/);
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
};
exports.parseDMY = parseDMY;
function formatDateRange(period) {
    const DATEFORMAT = "LLL dd";
    const DATEFORMATYEAR = "LLL dd, y";
    const defaultTo = new Date();
    const defaultFrom = (0, date_fns_1.subDays)(defaultTo, 30);
    if (!(period === null || period === void 0 ? void 0 : period.from)) {
        if (isSameYear(defaultFrom, defaultTo)) {
            return `${(0, date_fns_1.format)(defaultFrom, DATEFORMAT)} - ${(0, date_fns_1.format)(defaultTo, DATEFORMATYEAR)}`;
        }
        return `${(0, date_fns_1.format)(defaultFrom, DATEFORMATYEAR)} - ${(0, date_fns_1.format)(defaultTo, DATEFORMATYEAR)}`;
    }
    if (period.to) {
        if (isSameYear(new Date(period.from), new Date(period.to))) {
            return `${(0, date_fns_1.format)(period.from, DATEFORMAT)} - ${(0, date_fns_1.format)(period.to, DATEFORMATYEAR)}`;
        }
        return `${(0, date_fns_1.format)(period.from, DATEFORMATYEAR)} - ${(0, date_fns_1.format)(period.to, DATEFORMATYEAR)}`;
    }
    return (0, date_fns_1.format)(period.from, DATEFORMATYEAR);
}
function isSameYear(date1, date2) {
    return date1.getFullYear() === date2.getFullYear();
}
const formatReference = (reference) => {
    // S'assure d'avoir une chaîne de 10 caractères avec des zéros au début
    const refPadded = reference.padStart(10, '0');
    // Vérifie si la chaîne a la bonne longueur
    if (refPadded.length !== 10) {
        throw new Error('La référence doit avoir 10 caractères maximum');
    }
    // Extrait les parties
    const debut = refPadded.slice(0, 7); // 7 premiers caractères
    const fin = refPadded.slice(7, 10); // 3 caractères suivants
    // Retourne le format désiré
    return `${debut}.${fin}0`;
};
exports.formatReference = formatReference;
