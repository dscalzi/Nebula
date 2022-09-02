import { Module } from 'helios-distribution-types'
import { VersionSegmented } from '../util/VersionSegmented.js'
import { Resolver } from './Resolver.js'
import { MinecraftVersion } from '../util/MinecraftVersion.js'

export abstract class BaseResolver implements Resolver, VersionSegmented {

    constructor(
        protected absoluteRoot: string,
        protected relativeRoot: string,
        protected baseUrl: string
    ) {}

    public abstract getModule(): Promise<Module>
    public abstract isForVersion(version: MinecraftVersion, libraryVersion: string): boolean

}
