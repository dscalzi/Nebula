import { BaseMavenRepo } from './BaseMavenRepo'

export class ForgeRepoStructure extends BaseMavenRepo {

    public static readonly FORGE_GROUP = 'net.minecraftforge'
    public static readonly FORGE_ARTIFACT = 'forge'

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot, 'forge')
    }

    public getLocalForge(version: string, classifier?: string) {
        return this.getArtifactByComponents(
            ForgeRepoStructure.FORGE_GROUP,
            ForgeRepoStructure.FORGE_ARTIFACT,
            version, classifier, 'jar')
    }

}
