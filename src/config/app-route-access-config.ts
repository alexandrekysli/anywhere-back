import { z } from "zod"


// -> TS
type RouteAccessRulesType = {
	main_path: string,
	rules: {
		path: string,
		type: Array<'ip' | 'known' | 'user'>,
		app_user_type?: Array<'customer' | 'manager' | 'global_manager' | 'admin'>,
		secured: boolean,
		body: z.ZodObject<any>
	}[]
}[]

const sureStringRegex = /^[0-9a-zA-Zéè$çàêëôö@+-_"'=()ûüïî.,:;#?!* ]+$/i

/**
 * App Route Access Rules Config
 * ---
 * Archange
 * --
 * k-engine
 */

const routeAccessRules: RouteAccessRulesType = [{
	main_path: '/api/v1',
	rules: [
		{
			path: 'auth/login',
			secured: true,
			type: ['known'],
			body: z.object({
				pass_hash: z.string().regex(sureStringRegex)
			}).strict()
		},{ 
			path: 'auth/logout',
			secured: false,
			type: ['user'],
			body: z.object({}).strict()
		},{
			path: 'auth/user-data',
			secured: false,
			type: ['ip', 'known', 'user'],
			body: z.object({}).strict()
		},{
			path: 'auth/new-account',
			secured: false,
			type: ['user'],
			app_user_type: ['manager', 'global_manager', 'admin'],
			body: z.object({
				account_type: z.literal('global_manager').or(z.literal('manager')).or(z.literal('corporate')).or(z.literal('particular')),
				name: z.string().regex(sureStringRegex),
				surname: z.literal('').or(z.string().regex(sureStringRegex)),
				email: z.string().email(),
				phone: z.string().regex(sureStringRegex),
				global_manager: z.boolean().or(z.undefined())
			}).strict()
		},{
			path: 'auth/edit-auth',
			secured: true,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				pass_hash: z.string().regex(sureStringRegex),
				data: z.object({
					type: z.string().regex(sureStringRegex),
					list: z.object({
						'2fa': z.literal('').or(z.boolean()),
						email: z.literal('').or(z.string().email()),
						phone: z.literal('').or(z.string().regex(sureStringRegex)),
						password: z.literal('').or(z.string().regex(sureStringRegex))
					})
				})
			}).strict()
		},{
			path: 'auth/check-account-recovery',
			secured: true,
			type: ['known'],
			body: z.object({ 
				email: z.string().email()
			}).strict()
		},{
			path: 'auth/make-account-recovery',
			secured: false,
			type: ['known'],
			body: z.object({
				email: z.string().email(),
				pinHash: z.literal('').or(z.string().regex(sureStringRegex))
			}).strict()
		},{
			path: 'auth/otp/make',
			secured: false,
			type: ['known', 'user'],
			body: z.object({
				email: z.string().email()
			}).strict()
		},{
			path: 'auth/otp/check',
			secured: false,
			type: ['known', 'user'],
			body: z.object({
				pin: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'customers/get-all',
			app_user_type: ['manager', 'global_manager', 'admin'],
			secured: false,
			type: ['user'],
			body: z.object({}).strict()
		},{
			path: 'customers/get-available-managers',
			app_user_type: ['global_manager', 'admin'],
			secured: false,
			type: ['user'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'customers/get-by-manager',
			app_user_type: ['global_manager', 'admin'],
			secured: false,
			type: ['user'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'customers/get-one',
			app_user_type: ['manager', 'global_manager', 'admin'],
			secured: false,
			type: ['user'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'customers/set-state',
			app_user_type: ['manager', 'global_manager', 'admin'],
			secured: false,
			type: ['user'],
			body: z.object({
				id: z.string().regex(sureStringRegex),
				state: z.boolean()
			}).strict()
		},{
			path: 'customers/set-manager',
			app_user_type: ['global_manager', 'admin'],
			secured: false,
			type: ['user'],
			body: z.object({
				id: z.string().regex(sureStringRegex),
				to: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'customers/delete',
			app_user_type: ['manager', 'global_manager', 'admin'],
			secured: true,
			type: ['user'],
			body: z.object({
				id: z.string().regex(sureStringRegex),
				pass_hash: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'managers/get-all',
			app_user_type: ['global_manager', 'admin'],
			secured: false,
			type: ['user'],
			body: z.object({}).strict()
		},{
			path: 'managers/get-one',
			app_user_type: ['global_manager', 'admin'],
			secured: false,
			type: ['user'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'managers/set-state',
			app_user_type: ['global_manager', 'admin'],
			secured: false,
			type: ['user'],
			body: z.object({
				id: z.string().regex(sureStringRegex),
				state: z.boolean()
			}).strict()
		},{
			path: 'managers/delete',
			app_user_type: ['global_manager', 'admin'],
			secured: true,
			type: ['user'],
			body: z.object({
				id: z.string().regex(sureStringRegex),
				pass_hash: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'packages/get-all',
			app_user_type: ['manager', 'global_manager', 'admin'],
			secured: false,
			type: ['user'],
			body: z.object({}).strict()
		},{
			path: 'packages/get-all-full',
			app_user_type: ['admin'],
			secured: false,
			type: ['user'],
			body: z.object({}).strict()
		},{
			path: 'packages/get-one',
			app_user_type: ['admin'],
			secured: false,
			type: ['user'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'packages/add',
			app_user_type: ['admin'],
			secured: false,
			type: ['user'],
			body: z.object({
				data: z.object({
					name: z.string().regex(sureStringRegex),
					day_validity: z.number(),
					fleet: z.number().positive(),
					amount: z.number().positive(),
					accessibility: z.literal('all').or(z.literal('particular')).or(z.literal('corporate')),
					allowed_option: z.array(z.string().regex(sureStringRegex))
				})
			}).strict()
		},{
			path: 'packages/delete',
			app_user_type: ['admin'],
			secured: true,
			type: ['user'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'pairings/add',
			secured: false,
			type: ['user'],
			app_user_type: ['admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex),
				to: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'pairings/get-location',
			secured: false,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'pairings/make-all-alert-read',
			secured: false,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'pairings/set-pairing-io-relay-state',
			secured: true,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex),
				state: z.boolean(),
				pass_hash: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'pairings/get-trips',
			secured: false,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'pairings/get-fence-area',
			secured: false,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'pairings/set-fence-area',
			secured: false,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex),
				fenceAreaID: z.literal('').or(z.string().regex(sureStringRegex))
			}).strict()
		},{
			path: 'subscriptions/get-by-customer',
			secured: false,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'subscriptions/get-one',
			secured: false,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'subscriptions/add',
			secured: false,
			type: ['user'],
			app_user_type: ['manager', 'global_manager', 'admin'],
			body: z.object({
				data: z.object({
					customer: z.string().regex(sureStringRegex),
					manager: z.string().regex(sureStringRegex),
					package: z.string().regex(sureStringRegex),
					qte: z.number().positive(),
					provisioningSubscription: z.literal('').or(z.string().regex(sureStringRegex))
				})
			}).strict()
		},{
			path: 'subscriptions/edit-fleet',
			secured: false,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				data: z.object({
					id: z.string().regex(sureStringRegex),
					fleet: z.array(z.string().regex(sureStringRegex))
				})
			}).strict()
		},{
			path: 'subscriptions/suspend',
			secured: false,
			type: ['user'],
			app_user_type: ['manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'trackers/get-all',
			secured: false,
			type: ['user'],
			app_user_type: ['admin'],
			body: z.object({}).strict()
		},{
			path: 'trackers/get-all-available',
			secured: false,
			type: ['user'],
			app_user_type: ['manager', 'global_manager', 'admin'],
			body: z.object({}).strict()
		},{
			path: 'trackers/get-one',
			secured: false,
			type: ['user'],
			app_user_type: ['admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'trackers/get-pairing-list',
			secured: false,
			type: ['user'],
			app_user_type: ['admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'trackers/add',
			secured: false,
			type: ['user'],
			app_user_type: ['admin'],
			body: z.object({
				data: z.object({
					brand: z.string().regex(sureStringRegex),
					model: z.string().regex(sureStringRegex),
					imei: z.string().regex(sureStringRegex),
					sn: z.string().regex(sureStringRegex),
					sim: z.string().regex(sureStringRegex)
				})
			}).strict()
		},{
			path: 'trackers/set-state',
			secured: false,
			type: ['user'],
			app_user_type: ['admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex),
				pairingID: z.string().regex(sureStringRegex),
				state: z.literal('inventory').or(z.literal('paired')).or(z.literal('unpaired')).or(z.literal('lost')).or(z.literal('broken'))
			}).strict()
		},{
			path: 'trackers/delete',
			secured: false,
			type: ['user'],
			app_user_type: ['admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'vehicles/get-by-customer',
			secured: false,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'vehicles/get-available-vehicle',
			secured: false,
			type: ['user'],
			app_user_type: ['admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'vehicles/get-unsubscribed-by-customer',
			secured: false,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'vehicles/get-one',
			secured: false,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		},{
			path: 'vehicles/add',
			secured: false,
			type: ['user'],
			app_user_type: ['manager', 'global_manager', 'admin'],
			body: z.object({
				data: z.object({
					customer: z.string().regex(sureStringRegex),
					numberplate: z.string().regex(sureStringRegex),
					brand: z.string().regex(sureStringRegex),
					model: z.string().regex(sureStringRegex),
					type: z.literal('motorcycle').or(z.literal('car')).or(z.literal('truck')),
					group: z.string().regex(sureStringRegex),
					driver: z.string().regex(sureStringRegex),
					tracker: z.literal('').or(z.string().regex(sureStringRegex))
				})
			}).strict()
		},{
			path: 'vehicles/edit',
			secured: false,
			type: ['user'],
			app_user_type: ['customer', 'manager', 'global_manager', 'admin'],
			body: z.object({
				data: z.object({
					id: z.string().regex(sureStringRegex),
					numberplate: z.string().regex(sureStringRegex),
					group: z.string().regex(sureStringRegex),
					driver: z.string().regex(sureStringRegex),
					max_speed: z.string().regex(sureStringRegex)
				})
			}).strict()
		},{
			path: 'vehicles/delete',
			secured: false,
			type: ['user'],
			app_user_type: ['manager', 'global_manager', 'admin'],
			body: z.object({
				id: z.string().regex(sureStringRegex)
			}).strict()
		}
	]
}]

export default routeAccessRules