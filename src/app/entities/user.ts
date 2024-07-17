import ArchangeUserEntity from "#core/archange/entities/user.js"

class UserEntity {
    constructor(
        public readonly name: string,
        public readonly surname: string,
        public email: string,
        public phone: string,
        public readonly master_id: string,
        public readonly type: 'admin' | 'global_manager' | 'manager' | 'corporate' | 'particular',
        public readonly state: boolean,
        public readonly adding_date: number,
        public readonly godfather: string,
        public manager: string,
        public auth: {
            tfa_state: boolean,
            pass_hash: string,
            modification_date: number
        },
        public archange_caller?: ArchangeUserEntity,
        public id?: string
    ){}
}

export default UserEntity