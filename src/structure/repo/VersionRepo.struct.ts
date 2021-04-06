import { join } from 'path'
import { URL } from 'url'
import { BaseFileStructure } from '../BaseFileStructure'
import { MinecraftVersion } from '../../util/MinecraftVersion'

export class VersionRepoStructure extends BaseFileStructure {

    constructor(
        absoluteRoot: string,
        relativeRoot: string
    ) {
        super(absoluteRoot, relativeRoot, 'versions')
    }

    public getLoggerName(): string {
        return 'VersionRepoStructure'
    }

    public getFileName(minecraftVersion: MinecraftVersion, forgeVersion: string): string {
        return `${minecraftVersion}-forge-${forgeVersion}`
    }

    public getVersionManifest(minecraftVersion: MinecraftVersion, forgeVersion: string): string {
        const fileName = this.getFileName(minecraftVersion, forgeVersion)
        return join(this.containerDirectory, fileName, `${fileName}.json`)
    }

    public getVersionManifestURL(url: string, minecraftVersion: MinecraftVersion, forgeVersion: string): string {
        const fileName = this.getFileName(minecraftVersion, forgeVersion)
        return new URL(join(this.relativeRoot, fileName, `${fileName}.json`), url).toString()
    }

}
