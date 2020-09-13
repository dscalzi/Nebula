import { BaseMavenRepo } from './BaseMavenRepo'

export class LibRepoStructure extends BaseMavenRepo {

    public static readonly MINECRAFT_GROUP = 'net.minecraft'
    public static readonly MINECRAFT_CLIENT_ARTIFACT = 'client'

    public static readonly FORGE_GROUP = 'net.minecraftforge'
    public static readonly FORGE_ARTIFACT = 'forge'

    public static readonly LITELOADER_GROUP = 'com.mumfrey'
    public static readonly LITELOADER_ARTIFACT = 'liteloader'

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot, 'lib')
    }

    public getLoggerName(): string {
        return 'LibRepoStructure'
    }

    public getLocalForge(version: string, classifier?: string): string {
        return this.getArtifactByComponents(
            LibRepoStructure.FORGE_GROUP,
            LibRepoStructure.FORGE_ARTIFACT,
            version, classifier, 'jar')
    }

    public getLocalLiteLoader(version: string, classifier?: string): string {
        return this.getArtifactByComponents(
            LibRepoStructure.LITELOADER_GROUP,
            LibRepoStructure.LITELOADER_ARTIFACT,
            version, classifier, 'jar')
    }

}
