import { MinecraftVersion } from './MinecraftVersion.js'

export interface VersionSegmented {

    isForVersion(version: MinecraftVersion, libraryVersion: string): boolean

}
