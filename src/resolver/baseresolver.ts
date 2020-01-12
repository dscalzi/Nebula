import { Module } from '../model/spec/module'
import { VersionUtil } from '../util/versionutil'
import { Resolver } from './resolver'

export abstract class BaseResolver implements Resolver {

    protected static isVersionAcceptable(version: string, acceptable: number[]): boolean {
        const versionComponents = VersionUtil.getMinecraftVersionComponents(version)
        if (versionComponents != null && versionComponents.major === 1) {
            return acceptable.find((element) => versionComponents.minor === element) != null
        }
        return false
    }

    constructor(
        protected absoluteRoot: string,
        protected relativeRoot: string
    ) {}

    public abstract getModule(): Promise<Module>

    public abstract isForVersion(version: string): boolean

}
