import { Artifact, Module } from 'helios-distribution-types'
import { VersionSegmented } from '../util/VersionSegmented.js'
import { Resolver } from './Resolver.js'
import { MinecraftVersion } from '../util/MinecraftVersion.js'
import { Stats } from 'fs'
import { createHash } from 'crypto'

export abstract class BaseResolver implements Resolver, VersionSegmented {

    constructor(
        protected absoluteRoot: string,
        protected relativeRoot: string,
        protected baseUrl: string
    ) {}

    public abstract getModule(): Promise<Module>
    public abstract isForVersion(version: MinecraftVersion, libraryVersion: string): boolean

    protected generateArtifact(buf: Buffer, stats: Stats, url: string): Artifact {
        return {
            size: stats.size,
            MD5: createHash('md5').update(buf).digest('hex'),
            url
        }
    }

}
