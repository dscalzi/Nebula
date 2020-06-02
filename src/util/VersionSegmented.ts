import { MinecraftVersion } from './MinecraftVersion'

export interface VersionSegmented {

    isForVersion(version: MinecraftVersion, libraryVersion: string): boolean

}
