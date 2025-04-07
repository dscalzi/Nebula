import { createWriteStream } from 'fs'
import { mkdirs, ensureDir } from 'fs-extra/esm'
import got from 'got'
import StreamZip from 'node-stream-zip'
import { join, resolve, dirname } from 'path'
import { pipeline } from 'stream/promises'
import { ToggleableNamespace } from '../structure/spec_model/module/ToggleableModule.struct.js'
import { CreateServerResult } from '../structure/spec_model/Server.struct.js'
import { LoggerUtil } from '../util/LoggerUtil.js'

const log = LoggerUtil.getLogger('ModrinthParser')

export interface ModrinthIndex {
    formatVersion: number
    game: string
    versionId: string
    name: string
    summary?: string
    files: ModrinthFile[]
    dependencies: {
        minecraft: string
        'fabric-loader'?: string
        forge?: string
        'quilt-loader'?: string
        neoforge?: string
    }
}

export interface ModrinthFile {
    path: string
    hashes: {
        sha1: string
        sha512: string
    }
    env?: {
        client: "required" | "optional" | "unsupported"
        server: "required" | "optional" | "unsupported"
    }
    downloads: string[]
    fileSize: number
}

export class ModrinthParser {
    private modpackDir: string
    private mrpackPath: string

    constructor(
        private absoluteRoot: string,
        private mrpackFileName: string
    ) {
        this.modpackDir = join(absoluteRoot, 'modpacks', 'modrinth')
        this.mrpackPath = join(this.modpackDir, mrpackFileName)
    }

    public async init(): Promise<void> {
        await mkdirs(this.modpackDir)
    }

    public async getModpackIndex(): Promise<ModrinthIndex> {
        const zip = new StreamZip.async({ file: this.mrpackPath })
        try {
            return JSON.parse((await zip.entryData('modrinth.index.json')).toString('utf8')) as ModrinthIndex
        } finally {
            await zip.close()
        }
    }

    public async enrichServer(createServerResult: CreateServerResult, index: ModrinthIndex): Promise<void> {
        log.debug('Enriching server.')

        // Extract overrides
        const zip = new StreamZip.async({ file: this.mrpackPath })
        try {
            const entries = await zip.entries()
            
            // Extract overrides folder if it exists
            if ('overrides/' in entries) {
                log.debug('Extracting overrides...')
                await zip.extract('overrides/', createServerResult.miscFileContainer)
            }
            
            // Extract client overrides if present
            if ('client-overrides/' in entries) {
                log.debug('Extracting client overrides...')
                await zip.extract('client-overrides/', createServerResult.miscFileContainer)
            }
            
            // Extract server overrides if present
            if ('server-overrides/' in entries) {
                log.debug('Extracting server overrides...')
                await zip.extract('server-overrides/', createServerResult.miscFileContainer)
            }
        } finally {
            await zip.close()
        }

        if (createServerResult.modContainer) {
            const requiredPath = resolve(createServerResult.modContainer, ToggleableNamespace.REQUIRED)
            const optionalOnPath = resolve(createServerResult.modContainer, ToggleableNamespace.OPTIONAL_ON)
            const optionalOffPath = resolve(createServerResult.modContainer, ToggleableNamespace.OPTIONAL_OFF)

            // Download mods
            for (const file of index.files) {
                log.debug(`Processing file: ${file.path}`)
                
                const pathLower = file.path.toLowerCase()
                let targetPath: string
                
                // Determine directory based on file path
                if (pathLower.startsWith('mods/') && (pathLower.endsWith('.jar'))) {
                    // This is a mod jar file
                    const fileName = file.path.split('/').pop() || file.path
                    
                    // Determine if the mod is optional and whether it should be enabled by default
                    let modDir = requiredPath
                    if (file.env) {
                        const isClientOptional = file.env.client === 'optional'
                        const isServerOptional = file.env.server === 'optional'
                        
                        if (isClientOptional || isServerOptional) {
                            // This is an optional mod
                            modDir = optionalOnPath // Default to enabled optional mods
                            
                            // If both are optional, put it in optional-on
                            // If only one is optional and the other is unsupported, 
                            // we might want to consider optional-off
                            if ((isClientOptional && file.env.server === 'unsupported') || 
                                (isServerOptional && file.env.client === 'unsupported')) {
                                modDir = optionalOffPath
                            }
                        } else if (file.env.client === 'unsupported' && file.env.server === 'unsupported') {
                            // Skip files that are unsupported on both client and server
                            log.warn(`Skipping ${file.path} as it's unsupported on both client and server`)
                            continue
                        }
                    }
                    
                    targetPath = join(modDir, fileName)
                } else {
                    // Other files go to misc file container with their directory structure
                    targetPath = join(createServerResult.miscFileContainer, file.path)
                    
                    // Make sure parent directory exists
                    const parentDir = dirname(targetPath)
                    await ensureDir(parentDir)
                }
                
                const downloadUrl = file.downloads[0] // Use the first download URL
                
                if (!downloadUrl) {
                    log.warn(`No download URL available for ${file.path}`)
                    continue
                }
                
                log.debug(`Downloading ${file.path} to ${targetPath} from ${downloadUrl}`)
                
                try {
                    const downloadStream = got.stream(downloadUrl)
                    const fileWriterStream = createWriteStream(targetPath)
                    
                    await pipeline(downloadStream, fileWriterStream)
                } catch (error) {
                    log.error(`Failed to download ${file.path}`, error)
                }
            }
        }
    }
}