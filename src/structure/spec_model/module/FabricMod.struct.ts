import StreamZip from 'node-stream-zip'
import { Type } from 'helios-distribution-types'
import { capitalize } from '../../../util/StringUtils.js'
import { FabricModJson } from '../../../model/fabric/FabricModJson.js'
import { MinecraftVersion } from '../../../util/MinecraftVersion.js'
import { BaseModStructure } from './Mod.struct.js'
import { UntrackedFilesOption } from '../../../model/nebula/ServerMeta.js'

export class FabricModStructure extends BaseModStructure<FabricModJson> {

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        minecraftVersion: MinecraftVersion,
        untrackedFiles: UntrackedFilesOption[]
    ) {
        super(absoluteRoot, relativeRoot, 'fabricmods', baseUrl, minecraftVersion, Type.FabricMod, untrackedFiles)
    }

    public getLoggerName(): string {
        return 'FabricModStructure'
    }

    protected async getModuleId(name: string, path: string): Promise<string> {
        const fmData = await this.getModMetadata(name, path)
        let group
        if (fmData.entrypoints != null) {
            for (const t of ['main', 'client', 'server']) {
                if (fmData.entrypoints[t] != null && fmData.entrypoints[t].length > 0) {
                    const entrypoint = fmData.entrypoints[t][0]
                    group = typeof entrypoint === 'string' ? entrypoint : entrypoint.value
                    break
                }
            }
            // adapted from https://github.com/dscalzi/Claritas/blob/master/src/main/java/com/dscalzi/claritas/util/DataUtil.java
            if (group != null) {
                const packageBits = group.split('.')
                const blacklist = ['common', 'util', 'internal', 'tweaker', 'tweak', 'client', ...['forge', 'fabric', 'bukkit', 'sponge'].filter(t => t !== fmData.id)]
                // Note: Entry point is a fully qualified class name, hence why this adaptation pops immediately (drop class name).
                while (packageBits.length > 0) {
                    packageBits.pop()
                    const term = packageBits[packageBits.length - 1]
                    if ((term !== fmData.id && !blacklist.includes(term)) || packageBits.length === 1 || (packageBits.length === 2 && term === fmData.id)) {
                        break
                    }
                }
                group = packageBits.join('.')
            }
        }
        return this.generateMavenIdentifier(group || this.getDefaultGroup(), fmData.id, fmData.version)
    }
    protected async getModuleName(name: string, path: string): Promise<string> {
        const fmData = await this.getModMetadata(name, path)
        return capitalize(fmData.name || fmData.id)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected processZip(zip: StreamZip, name: string, path: string): FabricModJson {

        let raw: Buffer | undefined
        try {
            raw = zip.entryDataSync('fabric.mod.json')
        } catch(err) {
            // ignored
        }

        if (raw) {
            try {
                const parsed = JSON.parse(raw.toString()) as FabricModJson
                this.modMetadata[name] = parsed
            } catch (err) {
                this.logger.error(`FabricMod ${name} contains an invalid fabric.mod.json file.`)
            }
        } else {
            this.logger.error(`FabricMod ${name} does not contain fabric.mod.json file.`)
        }

        const crudeInference = this.attemptCrudeInference(name)

        if(this.modMetadata[name] == null) {
            this.modMetadata[name] = ({
                id: crudeInference.name.toLowerCase(),
                name: crudeInference.name,
                version: crudeInference.version
            })
        }

        return this.modMetadata[name]
    }
}
