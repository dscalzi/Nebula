import { Module } from '../../model/spec/module'
import { RepoStructure } from '../../model/struct/repo/repo.struct'
import { BaseResolver } from '../baseresolver'
import { Forge18Adapter } from './adapter/forge18.resolver'

export abstract class ForgeResolver extends BaseResolver {

    public static getResolver(version: string) {
        return ForgeResolver.ADAPTER_LIST[version]
    }

    // tslint:disable: object-literal-key-quotes
    private static readonly ADAPTER_LIST: {[version: string]: any} = {
        '1.8': Forge18Adapter,
        '1.9': Forge18Adapter,
        '1.10': Forge18Adapter,
        '1.11': Forge18Adapter,
        '1.12': Forge18Adapter
    }

    protected repoStructure: RepoStructure

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot)
        this.repoStructure = new RepoStructure(absoluteRoot, relativeRoot)
    }

    public abstract getModule(): Promise<Module>

}
