import { RepoStructure } from '../../model/struct/repo/repo.struct'
import { BaseResolver } from '../baseresolver'

export abstract class ForgeResolver extends BaseResolver {

    protected readonly REMOTE_REPOSITORY = 'https://files.minecraftforge.net/maven/'

    protected repoStructure: RepoStructure

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        protected minecraftVersion: string,
        protected forgeVersion: string
    ) {
        super(absoluteRoot, relativeRoot)
        this.repoStructure = new RepoStructure(absoluteRoot, relativeRoot)
    }

}
