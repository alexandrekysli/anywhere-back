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
    'KE_DATABASE_MONGO_PASSWORD'
]
let interfaceToListen: NetworkInterfaces | false = false
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
        ['KE_HTTP_PORT', 'KE_HTTP_SESSION_MAXDAY', 'KE_DATABASE_MONGO_PORT'].includes(property.name) &&
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
export default {
    error: errorMessage,
    root: path.join(__dirname, '..'),
    infrastructure: {
        web: {
            interface: interfaceToListen,
            port: getParsedProperty('KE_HTTP_PORT'),
            secured: Boolean(getParsedProperty('KE_HTTP_SECURE')),
            sessin: {
                secret: getParsedProperty('KE_HTTP_SESSION_SECRET'),
                cookie_max_day: getParsedProperty('KE_HTTP_SESSION_MAXDAY')
            }
        },
        database: {
            mongo: {
                host: getParsedProperty('KE_DATABASE_MONGO_HOST') + ':' + getParsedProperty('KE_DATABASE_MONGO_PORT'),
                user: getParsedProperty('KE_DATABASE_MONGO_USER'),
                password: encodeURIComponent(getParsedProperty('KE_DATABASE_MONGO_PASSWORD'))
            }
        }
    }
}

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
    const numberItem = ['KE_HTTP_PORT', 'KE_HTTP_SESSION_MAXDAY', 'KE_HTTP_SECURE', 'KE_DATABASE_MONGO_PORT']
    const item = envKEProperties.filter(x => x.name === name)[0]
    if(!item) return ''

    const value = item.value || ''
    return numberItem.includes(item.name) ? parseInt(value, 10) : value
}