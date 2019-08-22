import { lstat, readdir } from 'fs-extra'
import { join, resolve as resolvePath } from 'path'
import { resolve as resolveUrl } from 'url'
import { Server } from '../spec/server'
import { BaseModelStructure } from './basemodel.struct'
import { FileStructure } from './module/file.struct'
import { ForgeModStructure } from './module/forgemod.struct'
import { LiteModStructure } from './module/litemod.struct'

export class ServerStructure extends BaseModelStructure<Server> {

    private readonly ID_REGEX = /(.+-(.+)$)/

    constructor(
        absoluteRoot: string,
        baseUrl: string
    ) {
        super(absoluteRoot, '', 'servers', baseUrl)
    }

    public async getSpecModel() {
        if (this.resolvedModels == null) {
            this.resolvedModels = await this._doSeverRetrieval()
        }
        return this.resolvedModels
    }

    private async _doSeverRetrieval(): Promise<Server[]> {

        const accumulator: Server[] = []
        const files = await readdir(this.containerDirectory)
        for (const file of files) {
            const absoluteServerRoot = resolvePath(this.containerDirectory, file)
            const relativeServerRoot = join(this.relativeRoot, file)
            if ((await lstat(absoluteServerRoot)).isDirectory()) {

                const match = this.ID_REGEX.exec(file)
                if (match == null) {
                    console.warn(`Server directory ${file} does not match the defined standard.`)
                    console.warn(`All server ids must end with -<minecraft version> (ex. -1.12.2)`)
                    continue
                }

                let iconUrl

                // Resolve server icon
                const subFiles = await readdir(absoluteServerRoot)
                for (const subFile of subFiles) {
                    const caseInsensitive = subFile.toLowerCase()
                    if (caseInsensitive.endsWith('.jpg') || caseInsensitive.endsWith('.png')) {
                        iconUrl = resolveUrl(this.baseUrl, join(relativeServerRoot, subFile))
                    }
                }

                if (!iconUrl) {
                    console.warn(`No icon file found for server ${file}.`)
                    iconUrl = '<FILL IN MANUALLY>'
                }

                const forgeModStruct = new ForgeModStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
                const forgeModModules = await forgeModStruct.getSpecModel()

                const liteModStruct = new LiteModStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
                const liteModModules = await liteModStruct.getSpecModel()

                const fileStruct = new FileStructure(absoluteServerRoot, relativeServerRoot, this.baseUrl)
                const fileModules = await fileStruct.getSpecModel()

                const modules = [
                    ...forgeModModules,
                    ...liteModModules,
                    ...fileModules
                ]

                accumulator.push({
                    id: match[1],
                    name: '<FILL IN MANUALLY>',
                    description: '<FILL IN MANUALLY>',
                    icon: iconUrl,
                    version: '1.0.0',
                    address: '<FILL IN MANUALLY>',
                    minecraftVersion: match[2],
                    discord: {
                        shortId: '<FILL IN MANUALLY OR REMOVE>',
                        largeImageText: '<FILL IN MANUALLY OR REMOVE>',
                        largeImageKey: '<FILL IN MANUALLY OR REMOVE>'
                    },
                    mainServer: false,
                    autoconnect: false,
                    modules
                })

            } else {
                console.warn(`Path ${file} in server directory is not a directory!`)
            }
        }
        return accumulator
    }

}
