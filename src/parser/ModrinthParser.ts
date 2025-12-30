import { createWriteStream } from 'fs'
import { mkdirs, ensureDir, copy, writeJson, remove } from 'fs-extra/esm'
import got from 'got'
import StreamZip from 'node-stream-zip'
import { join, resolve, dirname } from 'path'
import { pipeline } from 'stream/promises'
import { writeFile } from 'fs/promises'
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

    private async extractAllFiles(zip: InstanceType<typeof StreamZip.async>, destDir: string): Promise<void> {
        const entries = await zip.entries()
        
        // Log all entries for debugging
        log.debug(`Found ${Object.keys(entries).length} total entries in zip file`)
        
        for (const [name, entry] of Object.entries(entries)) {
            // Skip the modrinth.index.json file and other metadata files at the root
            if (name === 'modrinth.index.json' || 
                name === 'modrinth.index.json.bak' || 
                name === 'manifest.json' ||
                name === 'META-INF/') {
                continue
            }
            
            // Check if this is an overrides or related directory
            if (name.startsWith('overrides/') || 
                name.startsWith('client-overrides/') || 
                name.startsWith('server-overrides/')) {
                
                let relativePath: string
                let targetPath: string
                
                if (name.startsWith('overrides/')) {
                    relativePath = name.substring('overrides/'.length)
                } else if (name.startsWith('client-overrides/')) {
                    relativePath = name.substring('client-overrides/'.length)
                } else if (name.startsWith('server-overrides/')) {
                    relativePath = name.substring('server-overrides/'.length)
                } else {
                    continue // Should never happen due to if conditions above
                }
                
                // Skip the root entries like "overrides/"
                if (relativePath.length === 0) {
                    continue
                }
                
                targetPath = join(destDir, relativePath)
                
                if (entry.isDirectory) {
                    log.debug(`Creating directory: ${targetPath}`)
                    await ensureDir(targetPath)
                } else {
                    log.debug(`Extracting file: ${name} to ${targetPath}`)
                    await ensureDir(dirname(targetPath))
                    try {
                        const buffer = await zip.entryData(name)
                        await writeFile(targetPath, buffer)
                    } catch (error: unknown) {
                        // Fix the TypeScript error by properly handling unknown type
                        if (error instanceof Error) {
                            log.error(`Error extracting ${name}: ${error.message}`)
                        } else {
                            log.error(`Error extracting ${name}: ${String(error)}`)
                        }
                    }
                }
            }
        }
        
        log.debug(`Finished extracting all override files to ${destDir}`)
    }

    public async enrichServer(createServerResult: CreateServerResult, index: ModrinthIndex): Promise<void> {
        log.debug('Enriching server.')

        // Extract overrides
        const zip = new StreamZip.async({ file: this.mrpackPath })
        
        try {
            // Save original modrinth.index.json directly from the zip file
            const serverDir = dirname(createServerResult.miscFileContainer)
            const indexPath = join(serverDir, 'modrinth.index.json')
            
            try {
                const originalIndexData = await zip.entryData('modrinth.index.json')
                await writeFile(indexPath, originalIndexData)
                log.debug(`Copied original modrinth.index.json to ${indexPath}`)
            } catch (error: unknown) {
                // If we can't get the original file for some reason, fall back to the parsed data
                await writeJson(indexPath, index, { spaces: 2 })
                log.debug(`Saved generated modrinth.index.json to ${indexPath}`)
            }
            
            // Extract all override files in one pass
            await this.extractAllFiles(zip, createServerResult.miscFileContainer)
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
                } catch (error: unknown) {
                    // Fix TypeScript error here too
                    if (error instanceof Error) {
                        log.error(`Failed to download ${file.path}: ${error.message}`)
                    } else {
                        log.error(`Failed to download ${file.path}: ${String(error)}`)
                    }
                }
            }
        }
    }
}