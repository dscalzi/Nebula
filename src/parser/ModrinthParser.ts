// Based on CurseForgeParser.ts

import { createWriteStream, lstatSync, existsSync } from 'fs'
import { opendir, rmdir } from 'fs/promises'
import { mkdirs, move } from 'fs-extra/esm'
import got from 'got'
import { HTTPError } from 'got'
import StreamZip from 'node-stream-zip'
import { join, resolve } from 'path'
import { pipeline } from 'stream/promises'
import { ToggleableNamespace } from '../structure/spec_model/module/ToggleableModule.struct.js'
import { CreateServerResult } from '../structure/spec_model/Server.struct.js'
import { LoggerUtil } from '../util/LoggerUtil.js'

const log = LoggerUtil.getLogger('ModrinthParser')

// No idea if this is right
export interface ModrinthManifest {
    game: string
    formatVersion: number
    versionId: string
    name: string
    summary: string // optional
    files: {
        path: string
        hashes: {
            sha1: string
            sha512: string
        }
        env: {  // optional
            client: string // required, optional or unsupported
            server: string // required, optional or unsupported
        }
        downloads: string[]
        fileSize: number 
    }[]
    dependencies: { // more dependency ids may be added in the future
        minecraft: string
        forge: string
        neoforge: string
        "fabric-loader": string
        "quilt-loader": string
    }
}

export interface ModrinthProjectResponse {
    project_type: string
    versions: string[]
    // There are more fields that we don't use right now. See https://docs.modrinth.com/#tag/projects/operation/getProject
}

export interface ModrinthVersionResponse {
    files: [
        {
            url: string
            primary: boolean
            filename: string
        }
    ]
    // There are more fields that we don't use right now. See https://docs.modrinth.com/#tag/versions/operation/getVersion
}

export class ModrinthParser {
    private modpackDir: string
    private zipPath: string

    private static mClient = got.extend({
        prefixUrl: 'https://api.modrinth.com/v2/',
        responseType: 'json'
    })

    constructor(
        private absoluteRoot: string,
    ) {
        this.modpackDir = join(absoluteRoot, 'modpacks', 'modrinth')
        this.zipPath = ''
    }

    public async init(): Promise<void> {
        await mkdirs(this.modpackDir)
    }

    public async resolveModpackZip(modpack: string): Promise<void> {
        log.debug('Resolving modpack zip.')

        // check if join(this.modpackDir, modpack) exists
        if(existsSync(join(this.modpackDir, modpack)) && lstatSync(join(this.modpackDir, modpack)).isFile()) {
            this.zipPath = join(this.modpackDir, modpack)
        } else {
            log.debug('Unable to find the modpack zip.')
            // check if the modpack is an url to a mrpack file
            if(modpack.match(/https?:\/\/.*\.mrpack/)) {
                log.debug('Downloading modpack from URL.')

                this.zipPath = join(this.modpackDir, modpack.split("/").pop()!)

                const downloadStream = got.stream(modpack)
                const fileWriterStream = createWriteStream(this.zipPath)
                await pipeline(downloadStream, fileWriterStream)

                log.debug('Downloaded.')
            } else {
                log.debug('Attempting to resolve the modpack on modrinth...')
                try {
                    // check if the modpack is a modrinth slug leading to a modpack
                    const data = (await ModrinthParser.mClient.get<ModrinthProjectResponse>(`project/${modpack}`)).body
                    if(data.project_type !== 'modpack') {
                        log.error('This project isn\'t a modpack.')
                        return
                    }

                    log.debug('Project found! Downloading the latest version.')

                    // get the latest version of the modpack
                    const latestVersion = (await ModrinthParser.mClient.get<ModrinthVersionResponse>(`version/${data.versions.pop()}`)).body
                    let modpackFile = latestVersion.files.find(file => file.primary)
                    
                    // ensure that the downloadUrl is a .mrpack file
                    if (!modpackFile || !modpackFile.url.endsWith('.mrpack')) {
                        modpackFile = latestVersion.files.find(file => file.url.endsWith('.mrpack'))
                    }

                    this.zipPath = join(this.modpackDir, modpackFile!.filename)
                    
                    // check if the file has already been downloaded before
                    if(existsSync(this.zipPath) && lstatSync(this.zipPath).isFile()) {
                        log.debug('The modpack has already been downloaded. Using the local file instead.')
                        return
                    }

                    // download the modpack
                    const downloadStream = got.stream(modpackFile!.url)
                    const fileWriterStream = createWriteStream(this.zipPath)
                    await pipeline(downloadStream, fileWriterStream)

                    log.debug('Downloaded.')
                } catch (error) {
                    // check if the error is a 404 error
                    if(error instanceof HTTPError) {
                        log.error(`${error.response.statusCode} - Failed to resolve modpack: ${modpack}`)
                    } else {
                        throw error
                    }
                }
            }
        }

    }

    public async getModpackManifest(): Promise<ModrinthManifest> {
        const zip = new StreamZip.async({ file: this.zipPath })
        return JSON.parse((await zip.entryData('modrinth.index.json')).toString('utf8')) as ModrinthManifest
    }

    public async enrichServer(createServerResult: CreateServerResult, manifest: ModrinthManifest): Promise<void> {
        log.debug('Enriching server.')

        // Extract overrides
        const zip = new StreamZip.async({ file: this.zipPath })
        try {
            await zip.extract("overrides/", createServerResult.miscFileContainer)
        }
        finally {
            await zip.close()
        }

        if(createServerResult.modContainer) {
            const requiredPath = resolve(createServerResult.modContainer, ToggleableNamespace.REQUIRED)
            const optionalPath = resolve(createServerResult.modContainer, ToggleableNamespace.OPTIONAL_ON)

            // Download mods
            for(const file of manifest.files) {
                // if client is unsupported, skip
                if(file.env?.client === 'unsupported') {
                    log.warn(`Skipping unsupported mod: ${file.path.split("/").pop()}`)
                    continue
                }

                // find the correct directory for this file
                let ressource_path: string
                if (file.path.startsWith("mods/")) {
                    log.debug(`Processing - Mod: ${file.path.split("/").pop()}`)
                    ressource_path = join(file.env?.client == "required" ? requiredPath : optionalPath, file.path.split("/").pop()!)
                } else {
                    log.debug(`Processing - Resource: ${file.path.split("/").pop()}`)
                    ressource_path = join(createServerResult.miscFileContainer, file.path)

                    // ensure that the path exists
                    await mkdirs(ressource_path.split("/").slice(0, -1).join("/") + "/")
                }
                
                const downloadStream = got.stream(file.downloads[0])
                const fileWriterStream = createWriteStream(ressource_path)

                await pipeline(downloadStream, fileWriterStream)
            }


            // move overrided mods to the required folder
            if(existsSync(join(createServerResult.miscFileContainer, 'mods')) && lstatSync(join(createServerResult.miscFileContainer, 'mods')).isDirectory()) {

                // move every override mod to the required folder
                const overrideMods = await opendir(join(createServerResult.miscFileContainer, 'mods'))
                for await (const mod of overrideMods) {
                    log.debug(`Moving ${mod.name}`)
                    await move(join(createServerResult.miscFileContainer, 'mods', mod.name), join(requiredPath, mod.name), { overwrite: true })
                }
                
                // delete the mods override folder
                await rmdir(join(createServerResult.miscFileContainer, 'mods'))
            }
        }
    }

}