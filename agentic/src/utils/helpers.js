import pkg from 'js-sha3';
const { keccak256 } = pkg;
import fs from 'fs/promises';
import path from 'path';

export const computeMessageHash = (message) => {
    return keccak256(message);
};

export const loadJsonFile = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        throw new Error(`Failed to load JSON file ${filePath}: ${error.message}`);
    }
};

export const getCurrentTimestamp = () => {
    return new Date().toISOString();
};

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));