import { MongoClient, MongoError, ObjectId } from "mongodb"
import IUserRepository from "../IUserRepository"
import UserEntity from "../../entities/user"
import Utils from "#utils/index.js"

class MongoUserRepository implements IUserRepository {
    private collection
    constructor(mongoClient: MongoClient, dbName: string){
        const db = mongoClient.db(dbName)
        this.collection = db.collection<UserEntity>('user')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'user')
            if(collIndex === -1) await db.createCollection('user')
            
            db.command({
                "collMod": "user",
                "validator": {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: [ 'name', 'surname', 'email', 'phone', 'master_id', 'type', 'state', 'adding_date', 'godfather', 'manager', 'auth' ],
                        additionalProperties: false,
                        properties: {
                            _id: {},
                            name: {
                                bsonType: 'string',
                                description: 'name is required and must be a string'
                            },
                            surname: {
                                bsonType: 'string',
                                description: 'surname is required and must be a string'
                            },
                            email: {
                                bsonType: 'string',
                                description: 'email is required and must be a string'
                            },
                            phone: {
                                bsonType: 'string',
                                description: 'phone is required and must be a string'
                            },
                            master_id: {
                                bsonType: 'string',
                                description: 'master_id is required and must be a string'
                            },
                            type: {
                                bsonType: 'string',
                                description: 'type is required and must be a string'
                            },
                            state: {
                                bsonType: 'bool',
                                description: 'state is required and must be a boolean'
                            },
                            adding_date: {
                                bsonType: 'number',
                                description: 'adding_date is required and must be a number'
                            },
                            godfather: {
                                bsonType: 'string',
                                description: 'godfather is required and must be a string'
                            },
                            manager: {
                                bsonType: 'string',
                                description: 'manager is required and must be a string'
                            },
                            auth: {
                                bsonType: 'object',
                                required: ['tfa_state', 'pass_hash', 'modification_date'],
                                additionalProperties: false,
                                properties: {
                                    tfa_state: {
                                        bsonType: 'bool',
                                        description: 'tfa_state is required and must be a boolean'
                                    },
                                    pass_hash: {
                                        bsonType: 'string',
                                        description: 'pass_hash is required and must be a string'
                                    },
                                    modification_date: {
                                        bsonType: 'number',
                                        description: 'modification_date is required and must be a number'
                                    },
                                }
                            }
                        }
                    }
                }
            })
        })
    }

    async addUser(user: UserEntity): Promise<{ data: UserEntity | null; err: string }> {
        try {
            const nowDate = Date.now()
            delete user.archange_caller
            delete user.id

            const result = await this.collection.insertOne({ ...user })
            if(result.insertedId) user.id = result.insertedId.toString()
            return {
                data: result.insertedId && user || null,
                err: ''
            }
        } catch (error) {
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }

    async getUserByType(type: string): Promise<{ data?: UserEntity[]; err?: string }> {
        const groupedType = {
            manager: ['global_manager', 'manager'],
            customer: ['corporate', 'particular']
        }
        const userList: UserEntity[] = []

        try {
            const result = await this.collection.find().toArray()
            result.forEach(x => {
                if(groupedType[type as keyof typeof groupedType].includes(x.type)) userList.push(new UserEntity(
                    x.name,
                    x.surname,
                    x.email,
                    x.phone,
                    x.master_id,
                    x.type,
                    x.state,
                    x.adding_date,
                    x.godfather,
                    x.manager,
                    x.auth,
                    undefined,
                    x._id.toString()
                ))
            })
            return { data: userList }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getUserBySpecs(email: string, phone: string): Promise<{ data?: UserEntity | null; err?: string }> {
        try {
            const userDocument = await this.collection.findOne({ $or: [{ email: email }, { phone: phone }] })
            if(userDocument){
                const user = new UserEntity(
                    userDocument.name,
                    userDocument.surname,
                    userDocument.email,
                    userDocument.phone,
                    userDocument.master_id,
                    userDocument.type,
                    userDocument.state,
                    userDocument.adding_date,
                    userDocument.godfather,
                    userDocument.manager,
                    userDocument.auth,
                    undefined,
                    userDocument._id.toString()
                )
                return { data: user }
            }else return { data: null }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getUserByID(id: string): Promise<{ data?: UserEntity | null; err?: string }> {
        try {
            const userDocument = await this.collection.findOne({ _id: new ObjectId(id) })
            if(userDocument){
                const user = new UserEntity(
                    userDocument.name,
                    userDocument.surname,
                    userDocument.email,
                    userDocument.phone,
                    userDocument.master_id,
                    userDocument.type,
                    userDocument.state,
                    userDocument.adding_date,
                    userDocument.godfather,
                    userDocument.manager,
                    userDocument.auth,
                    undefined,
                    userDocument._id.toString()
                )
                return { data: user }
            }else return { data: null }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getUserByPassHash(passHash: string): Promise<{ data?: UserEntity | null; err?: string }> {
        try {
            const userDocument = await this.collection.findOne({ 'auth.pass_hash': passHash })
            if(userDocument){
                const user = new UserEntity(
                    userDocument.name,
                    userDocument.surname,
                    userDocument.email,
                    userDocument.phone,
                    userDocument.master_id,
                    userDocument.type,
                    userDocument.state,
                    userDocument.adding_date,
                    userDocument.godfather,
                    userDocument.manager,
                    userDocument.auth,
                    undefined,
                    userDocument._id.toString()
                )
                return { data: user }
            }else return { data: null }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getUserByArchangeLinkHash(linkHash: string): Promise<{ data?: UserEntity; err?: string }> {
        try {
            const userDocument = (await this.collection.find().toArray()).filter(x => Utils.makeSHA256(`4C#${x.master_id}@`) === linkHash)[0]
            if(userDocument){
                const user = new UserEntity(
                    userDocument.name,
                    userDocument.surname,
                    userDocument.email,
                    userDocument.phone,
                    userDocument.master_id,
                    userDocument.type,
                    userDocument.state,
                    userDocument.adding_date,
                    userDocument.godfather,
                    userDocument.manager,
                    userDocument.auth,
                    undefined,
                    userDocument._id.toString()
                )
                return { data: user }
            }else return { data: undefined }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }
    
}

export default MongoUserRepository