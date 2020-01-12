import { RepoStructure } from '../../model/struct/repo/repo.struct'
import { BaseResolver } from '../baseresolver'

export abstract class ForgeResolver extends BaseResolver {

    protected readonly REMOTE_REPOSITORY = 'https://files.minecraftforge.net/maven/'

    protected repoStructure: RepoStructure

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        protected minecraftVersion: string,
        protected forgeVersion: string
    ) {
        super(absoluteRoot, relativeRoot, baseUrl)
        this.repoStructure = new RepoStructure(absoluteRoot, relativeRoot)
    }

}
