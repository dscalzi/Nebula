import { MinecraftVersion } from './MinecraftVersion'

export interface VersionSegmented {

    isForVersion(version: MinecraftVersion): boolean

}
