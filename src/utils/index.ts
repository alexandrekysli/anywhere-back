/* ### Load Node modules ### */
import { Response } from 'express'
import fs, { Dirent } from 'fs'
import Crypto from "node:crypto"

/** Types */
type FolderElement = { name: string, type: 'folder' | 'file' | undefined }
type FolderContent = { folder: Array<FolderElement>, file: Array<FolderElement> }
type SchemaValidationField = { name: string, type: string, required: boolean, data?: {[key: string]: any | {}} }
type MongoSchemaValidation = {
    $jsonSchema: {
        bsonType: 'object',
        required: string[],
        additionalProperties: false,
        properties: {[key: string]: string | {}}
    }
}

/**
 * # Utils
 * Utility method set\
 * k-engine
 */

class Utils {
    /**
     * Make random number from interval
     * @param min Minimal value
     * @param max Maximum value
     * @returns Random number
     */
    static getRandomNumber = (min: number, max: number) => {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    /** Generated random string equal to defined length */
    static genString = (length: number, full = false, number= false) => {
        let allCar = ''
        let randomString = ''

        if (!full) allCar = !number ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" : "123456789"
        else allCar = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$@_-'

        for (let i = 0; i < length; i++) {
            randomString = randomString + allCar[this.getRandomNumber(0, allCar.length - 1)]
        }
        return randomString;
    }

    /**
     * Get the name of file into specific folder
     * @param {string} `folder` - The folder who operation been run
     * @param {number} `contentType` - Type of content `0` All - `1` File - `2` Folder
     * @param {boolean} `showFileExtension` - Showing extension ?
     * @param {boolean} `grouped` - Return grouped
    */
    static getFolderContentSync = (
        folder: string,
        contentType: number,
        showFileExtension: boolean,
        grouped: boolean = false
    ) => {
        try {
            const folderContent = fs.readdirSync(folder, { withFileTypes: true })
            let passedContent: Dirent[]
            if (contentType === 1) passedContent = folderContent.filter(x => !x.isDirectory())
            else if (contentType === 2) passedContent = folderContent.filter(x => x.isDirectory())
            else if (contentType === 0) passedContent = folderContent
            else passedContent = []

            const typedContent: FolderContent = { folder: [], file: [] }
            passedContent.forEach(x => {
                const rep = x.isDirectory() ? 'folder' : 'file'
                if (showFileExtension) typedContent[rep].push({ name: x.name, type: rep })
                else {
                    x.isDirectory()
                        ? typedContent[rep].push({ name: x.name, type: rep })
                        : typedContent[rep].push({ name: x.name.slice(0, x.name.lastIndexOf('.')), type: rep })
                }
            })
            return grouped ? [...typedContent.file, ...typedContent.folder] : typedContent
        } catch (err) {
            return { folder: [], file: [] }
        }
    }

    static timestampDiff = (newTimestamp: number, oldTimestamp: number, diffMode: 'second' | 'minute' | 'hour' | 'day') => {
        const _timestamp = new Date(newTimestamp - oldTimestamp)
        const timestamp = _timestamp.getTime() / 1000

        switch (diffMode) {
            case 'second':
                return timestamp
            case 'minute':
                return Math.trunc(timestamp / 60)
            case 'hour':
                return Math.trunc(timestamp / 3600)
            case 'day':
                return Math.trunc(timestamp / 86400)
            default:
                return timestamp
        }
    }

    /**
     * Return a unique hash from a array
     * @param activeArray Actual used hastring hash
     * @param length length of returned string hash
     * @returns unique hash of current given activeArray
     */
    static makeUniqueHash = (activeArray: Array<string>, length: number) => {
        let _hash: string
        do {
            _hash = this.genString(length, true, false)
        } while (activeArray.includes(_hash))

        return _hash
    }

    /**
     * Return a MD5 hash from specified value
     * @param value text value to hash
     */
    static makeMD5 = (value: string) => {
        return Crypto.createHash('md5').update(value).digest("hex")
    }

    /**
     * Return a SHA256 hash from specified value
     * @param value text value to hash
     */
    static makeSHA256 = (value: string) => {
        return Crypto.createHash('sha256').update(value).digest("hex")
    }

    /**
     * Return mongoDB validation schema
     * @param collectionName name of collection (if existing)
     * @param fields database schema to use for collection validation
     */
    static makeMongoSchemaValidation = (fields: SchemaValidationField[]) : MongoSchemaValidation => {
        const schema: MongoSchemaValidation = {
            $jsonSchema: {
                bsonType: 'object',
                required: [],
                additionalProperties: false,
                properties: { _id: {} }
            }
        }

        for (const field of fields) {
            field.required && schema.$jsonSchema.required.push(field.name)
            if(field.data){
                schema.$jsonSchema.properties[field.name] = field.data
            }else{
                schema.$jsonSchema.properties[field.name] = {
                    bsonType: field.type,
                    description: `${field.name} is required and must be a ${field.type}`
                }
            }
        }

        return schema
    }

    static makeHeavenResponse = (res: Response, data: any) => {
        return res.locals.archange_check ? { archange: res.locals.archange_check, data: data } : {}
    }

    static degreesToRadians = (degrees: number) => degrees * Math.PI / 180

    static distanceBetweenCoordinates = (one: Coordinates, two: Coordinates) => {
        const earthRadiusKm = 6371

        const dLat = this.degreesToRadians(two.lat - one.lat)
        const dLon = this.degreesToRadians(two.lng - one.lng)
      
        const lat1 = this.degreesToRadians(one.lat)
        const lat2 = this.degreesToRadians(two.lat)
      
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) 
        return earthRadiusKm * c
    }

    static obscurifyPhoneNumber = (number: string, showedPart: number) => {
        let phoneNumberZip = number.split(' ')[0]
        const numberWithoutZip = number.replace(phoneNumberZip, '')
        const unespacedNumberWithoutZip = number.replace(phoneNumberZip, ' ').replace(/ /g, '')
    
        let phone = ''
        let noSpaceCharacterCount = 0
        for (let i = 0; i < numberWithoutZip.length; i++) {
            const character = numberWithoutZip.charAt(i)
            if(character !== ' '){
                phone += (noSpaceCharacterCount > showedPart - 1 && (unespacedNumberWithoutZip.length - noSpaceCharacterCount > showedPart) ? '*' : character)
                noSpaceCharacterCount++
            }else phone += ' '
        }
        return phoneNumberZip + phone
    }
}

export default Utils