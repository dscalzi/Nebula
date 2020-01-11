import { BaseMavenRepo } from './BaseMavenRepo'

export class LibRepoStructure extends BaseMavenRepo {

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot, 'lib')
    }

}
