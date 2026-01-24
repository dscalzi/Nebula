export interface InstallerManifestFG3 {
    id: number
    version: string
    minecraft: string
    data: Record<'MAPPINGS'
        | 'MOJMAPS'
        | 'MERGED_MAPPINGS'
        | 'BINPATCH'
        | 'MC_UNPACKED'
        | 'MC_SLIM'
        | 'MC_SLIM_SHA'
        | 'MC_EXTRA'
        | 'MC_EXTRA_SHA'
        | 'MC_SRG'
        | 'PATCHED'
        | 'PATCHED_SHA'
        | 'MCP_VERSION', { client: string, server: string }>
    processors: {
        sides?: ('client' | 'server')[]
        jar: string
        classpath: string[]
        args: string[]
    }[]
    libraries: {
        name: string
        downloads: {
            artifact: {
                path: string
                url: string
                sha1: string
                size: number
            }
        }
    }[]
}