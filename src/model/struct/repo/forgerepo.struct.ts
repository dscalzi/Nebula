import { BaseMavenRepo } from './BaseMavenRepo'

export class ForgeRepoStructure extends BaseMavenRepo {

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot, 'forge')
    }

    public getLocalForge(version: string, classifier?: string) {
        this.getArtifactByComponents('net.minecraftforge', 'forge', version, classifier, 'jar')
    }

}
