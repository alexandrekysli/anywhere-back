import "dotenv/config"
import path from "node:path"
import { networkInterfaces } from "node:os"

/* Types */
type NetworkInterfaces = { name: string, mac: string, address: string, mask: string }

// -> Retrieve app configuration

let errorMessage = ''
let requireEnvProperties = [
    'KE_HTTP_PORT',
    'KE_HTTP_SESSION_SECRET',
    'KE_HTTP_SESSION_MAXDAY',
    'KE_DATABASE_MONGO_HOST',
    'KE_DATABASE_MONGO_PORT',
    'KE_DATABASE_MONGO_USER',
    'KE_DATABASE_MONGO_PASSWORD',
    'KE_EMAIL_HOST',
    'KE_EMAIL_PORT',
    'KE_EMAIL_USER',
    'KE_EMAIL_PASSWORD',
    'KE_GOOGLE_API_KEY',
    'KE_ORANGE_API_ID',
    'KE_ORANGE_API_SECRET',
    'KE_ORANGE_API_AUTHOTIZATION'
]
let interfaceToListen: NetworkInterfaces | undefined
const envKEPropertiesName = Object.getOwnPropertyNames(process.env).filter(x => x.includes('KE_'))
const envKEProperties = envKEPropertiesName.map(x => { return { name: x, value: process.env[x] } })
const externalNetworkInterfaceList = getServerExternalInterface()


// -> Check required environnement properties
for (const property of envKEProperties) {
    const requiredEnvPropertyIndex = requireEnvProperties.findIndex(x => x === property.name)
    requiredEnvPropertyIndex !== -1 && requireEnvProperties.splice(requiredEnvPropertyIndex, 1)

    if(
        !['KE_HTTP_INTERFACE', 'KE_HTTP_SECURE'].includes(property.name) &&
        property.value === ''
    ){
        // -> Detect if env property incorrectly set
        requireEnvProperties = [property.name]
        break
    }else if(
        ['KE_HTTP_PORT', 'KE_HTTP_SESSION_MAXDAY', 'KE_DATABASE_MONGO_PORT', 'KE_EMAIL_PORT'].includes(property.name) &&
        isNaN(Number(property.value))
    ){
        // -> Detect if env numeric property incorrectly set        
        errorMessage = `the property < ${property.name} > value defined in .env file should be a number`
        requireEnvProperties = []
        break
    }else if(
        property.name === 'KE_HTTP_INTERFACE'
    ){
        const interfaceIndex = externalNetworkInterfaceList.findIndex(x => x.name === property.value)
        if(interfaceIndex === -1){
            // -> Detect if defined network interface exist
            errorMessage = `the interface < ${property.value} > of < ${property.name} > defined in .env file not exist`
            requireEnvProperties = []
            break
        }
        interfaceToListen = externalNetworkInterfaceList[interfaceIndex]
    }
}

// -> Parse and save error message
const undefinedRequiredEnvProperty = requireEnvProperties.length ? requireEnvProperties.toString().replace(/\,/g, ', ') : ''
if(undefinedRequiredEnvProperty) errorMessage = `the propert${requireEnvProperties.length > 1 ? 'ies' : 'y'} < ${undefinedRequiredEnvProperty} > not correctly defined in .env file`


/**
 * App Config
 * ---
 * Anywhere
 */
const Config = {
    error: errorMessage,
    root: path.join(__dirname, '..'),
    infrastructure: {
        web: {
            routes_directory: '/app/controllers/routes',
            interface: interfaceToListen,
            port: parseInt(getParsedProperty('KE_HTTP_PORT'), 10),
            secured: Boolean(getParsedProperty('KE_HTTP_SECURE')),
            session: {
                secret: getParsedProperty('KE_HTTP_SESSION_SECRET').toString(),
                cookie_max_day: parseInt(getParsedProperty('KE_HTTP_SESSION_MAXDAY').toString(), 10) * 86400000
            }
        },
        database: {
            mongo: {
                host: getParsedProperty('KE_DATABASE_MONGO_HOST') + ':' + getParsedProperty('KE_DATABASE_MONGO_PORT'),
                user: getParsedProperty('KE_DATABASE_MONGO_USER'),
                password: encodeURIComponent(getParsedProperty('KE_DATABASE_MONGO_PASSWORD')),
                db: 'anywhere'
            }
        },
        archange: {
            bucket: {
                limit: {
                    ip: 10,
                    known: 15,
                    user: 50
                },
                frame_lifetime: 10
            },
            caller: {
                max: {
                    ip: 10,
                    known: 1,
                    user: 5
                }
            },
            hell: {
                max_dos_per_hour: 5,
                delayed_time: 5 * 60 * 1000,
                dos_ban_time: 1 * 3600 * 1000
            },
            otp: {
                limit: {
                    ip: 1,
                    known: 3,
                    user: 5
                }
            }
        },
        tracking_bot: {
            devices_directory: '/modules/tracking-bot/devices',
            anytracker: {
                timeout: {
                    ghost: 60,
                    off: 30
                }
            },
            trip_limit: {
                min_move_duration: 300,
                max_stop_duration: 300,
                min_move_mileage: 500
            }
        },
        email: {
            host: getParsedProperty('KE_EMAIL_HOST'),
            port: parseInt(getParsedProperty('KE_EMAIL_PORT'), 10),
            secure: true,
            auth: {
                user: getParsedProperty('KE_EMAIL_USER'),
                pass: getParsedProperty('KE_EMAIL_PASSWORD')
            }
        },
        sms: {
            authorization: getParsedProperty('KE_ORANGE_API_AUTHOTIZATION'),
            secret: getParsedProperty('KE_ORANGE_API_SECRET'),
            id: getParsedProperty('KE_ORANGE_API_ID')
        },
        api_key: {
            google: getParsedProperty('KE_GOOGLE_API_KEY')
        }
    },
    admin_email: 'alexhacker1995@gmail.com'
}

export default Config
export type ConfigType = typeof Config

// -> Inbuilt function

/** Retrieve server external network interfaces online */
function getServerExternalInterface () {
    const allInterface = networkInterfaces()
    const externalNetworkInterface: NetworkInterfaces[] = []
    for (const item of Object.keys(allInterface)) {
        const x = allInterface[item]
        if (x) {
            for (const net of x) {
                if (net.family === "IPv4" && !net.internal) {
                    externalNetworkInterface.push({
                        name: item,
                        mac: net.mac,
                        address: net.address,
                        mask: net.netmask
                    })
                }
            }
        }
    }
    return externalNetworkInterface
}

/** Retrieve good property value from envKEProperties */
function getParsedProperty (name: string) {
    const item = envKEProperties.filter(x => x.name === name)[0]
    if(!item) return ''

    const value = item.value || ''
    return value
}