import { BaseMavenRepo } from './BaseMavenRepo'

export class LibRepoStructure extends BaseMavenRepo {

    public static readonly MINECRAFT_GROUP = 'net.minecraft'
    public static readonly MINECRAFT_CLIENT_ARTIFACT = 'client'

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot, 'lib')
    }

}
