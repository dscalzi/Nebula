import { BaseFileStructure } from '../BaseFileStructure'

export class ForgeRepoStructure extends BaseFileStructure {

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot, 'forge')
    }

}
