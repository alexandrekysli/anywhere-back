import OriginEntity from "./origin";

class CallerEntity {
    constructor(
        public readonly id: string | undefined,
        public readonly type: 'ip' | 'known' | 'user',
        public identifier: string,
        public originList: OriginEntity[] = []
    ){}
}

export default CallerEntity