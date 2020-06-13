import StreamZip from 'node-stream-zip'
import { Stats } from 'fs-extra'
import { Type } from 'helios-distribution-types'
import { join } from 'path'
import { resolve } from 'url'
import { capitalize } from '../../../../util/stringutils'
import { LiteMod } from '../../../liteloader/litemod'
import { ModuleStructure } from './module.struct'

export class LiteModStructure extends ModuleStructure {

    private liteModMetadata: {[property: string]: LiteMod | undefined} = {}

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string
    ) {
        super(absoluteRoot, relativeRoot, 'litemods', baseUrl, Type.LiteMod)
    }

    protected async getModuleId(name: string, path: string): Promise<string> {
        const liteModData = await this.getLiteModMetadata(name, path)
        return this.generateMavenIdentifier(liteModData.name, `${liteModData.version}-${liteModData.mcversion}`)
    }
    protected async getModuleName(name: string, path: string): Promise<string> {
        return capitalize((await this.getLiteModMetadata(name, path)).name)
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModuleUrl(name: string, path: string, stats: Stats): Promise<string> {
        return resolve(this.baseUrl, join(this.relativeRoot, name))
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModulePath(name: string, path: string, stats: Stats): Promise<string | null> {
        return null
    }

    private getLiteModMetadata(name: string, path: string): Promise<LiteMod> {
        return new Promise((resolve, reject) => {
            if (!Object.prototype.hasOwnProperty.call(this.liteModMetadata, name)) {

                const zip = new StreamZip({
                    file: path,
                    storeEntries: true
                })

                zip.on('error', err => reject(err))
                zip.on('ready', () => {
                    try {
                        const res = this.processZip(zip, name)
                        zip.close()
                        resolve(res)
                        return
                    } catch(err) {
                        zip.close()
                        reject(err)
                        return
                    }
                })

            } else {
                resolve(this.liteModMetadata[name] as LiteMod)
                return
            }

        })
    }

    private processZip(zip: StreamZip, name: string): LiteMod {

        let raw: Buffer | undefined
        try {
            raw = zip.entryDataSync('litemod.json')
        } catch(err) {
            // ignored
        }

        if (raw) {
            this.liteModMetadata[name] = JSON.parse(raw.toString()) as LiteMod
        } else {
            throw new Error(`Litemod ${name} does not contain litemod.json file.`)
        }

        return this.liteModMetadata[name] as LiteMod

    }

}
