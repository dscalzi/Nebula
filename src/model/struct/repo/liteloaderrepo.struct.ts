import { BaseFileStructure } from '../BaseFileStructure'

export class LiteLoaderRepoStructure extends BaseFileStructure {

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot, 'liteloader')
    }

}
