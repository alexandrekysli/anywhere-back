import Utils from "#utils/index.js"
import ArchangeUserEntity from "../../entities/user"
import IArchangeUserRepository from "../interfaces/IUserRepository"

import { MongoClient, MongoError, ObjectId } from "mongodb"

class MongoArchangeUserRepository implements IArchangeUserRepository {
    private userCollection
    constructor(mongoClient: MongoClient, dbName: string){
        const db = mongoClient.db(dbName)
        this.userCollection = db.collection<ArchangeUserEntity>('archange-user')
        db.listCollections().toArray().then(async info => {
            const userCollIndex = info.findIndex(x => x.name === 'archange-user')
            if(userCollIndex === -1) await db.createCollection('archange-user')  
            db.command({
                "collMod": "archange-user", 
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'link_hash', type: 'string', required: true }
                ])
            })

            const groupCollIndex = info.findIndex(x => x.name === 'archange-group')
            if(groupCollIndex === -1) await db.createCollection('archange-group')  
            db.command({
                "collMod": "archange-group", 
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'name', type: 'string', required: true },
                    { name: 'description', type: 'string', required: true },
                    { name: 'state', type: 'bool', required: true },
                    { name: 'access', type: 'complexe', required: true, data: {
                        bsonType: ['array'],
                        items: {
                            bsonType: 'object',
                            required: ['name', 'description'],
                            additionalProperties: false,
                            properties: {
                                name: {
                                    bsonType: 'string',
                                    description: 'name is required and must be a string'
                                },
                                description: {
                                    bsonType: 'string',
                                    description: 'description is required and must be a string'
                                }
                            }
                        }
                    } },
                ])
            })
        })
    }

    async addUser(linkHash: string): Promise<{ data?: ArchangeUserEntity | null; err?: string }> {
        try {
            const newUser = await this.userCollection.insertOne({ link_hash: linkHash })
            if(newUser.insertedId){
                return {
                    data: new ArchangeUserEntity(
                        linkHash,
                        newUser.insertedId.toString()
                    )
                }
            }else return { data: null }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getUserByLinkHash(linkHash: string): Promise<{ data?: ArchangeUserEntity | null; err?: string }> {
        try {
            const userDocument = await this.userCollection.findOne({ link_hash: linkHash })          
            if(userDocument){
                const user = new ArchangeUserEntity(
                    userDocument.link_hash,
                    userDocument._id.toString()
                )
                return { data: user }
            }else return { data: null }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async removeUser(id: string): Promise<{ data?: boolean; err?: string }> {
        try {
            const result = await this.userCollection.deleteOne({ _id: new ObjectId(id) }) 
            return { data: Boolean(result.deletedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }
}

export default MongoArchangeUserRepository