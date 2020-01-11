import { BaseMavenRepo } from './BaseMavenRepo'

export class LiteLoaderRepoStructure extends BaseMavenRepo {

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot, 'liteloader')
    }

    public getLocalLiteLoader(version: string, classifier?: string) {
        return this.getArtifactByComponents('com.mumfrey', 'liteloader', version, classifier, 'jar')
    }

}
