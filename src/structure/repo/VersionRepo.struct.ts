import { join } from 'path'
import { URL } from 'url'
import { BaseFileStructure } from '../BaseFileStructure.js'
import { MinecraftVersion } from '../../util/MinecraftVersion.js'

export class VersionRepoStructure extends BaseFileStructure {

    private name: string

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        name: string
    ) {
        super(absoluteRoot, relativeRoot, 'versions')
        this.name = name
    }

    public getLoggerName(): string {
        return 'VersionRepoStructure'
    }

    public getFileName(minecraftVersion: MinecraftVersion, loaderVersion: string): string {
        return `${minecraftVersion}-${this.name}-${loaderVersion}`
    }

    public getVersionManifest(minecraftVersion: MinecraftVersion, loaderVersion: string): string {
        const fileName = this.getFileName(minecraftVersion, loaderVersion)
        return join(this.containerDirectory, fileName, `${fileName}.json`)
    }

    public getVersionManifestURL(url: string, minecraftVersion: MinecraftVersion, loaderVersion: string): string {
        const fileName = this.getFileName(minecraftVersion, loaderVersion)
        return new URL(join(this.relativeRoot, fileName, `${fileName}.json`), url).toString()
    }

}
