import { BaseFileStructure } from '../BaseFileStructure'

export class LibRepoStructure extends BaseFileStructure {

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot, 'lib')
    }

}
