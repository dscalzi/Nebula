export interface ModrinthIndexFile {
    path: string
    hashes: {
        sha512?: string
        sha1?: string
    }
    env: {
        server: 'required' | 'optional' | 'unsupported'
        client: 'required' | 'optional' | 'unsupported'
    }
    downloads: string[]
    fileSize: number
}

export interface ModrinthIndex {
    game: string
    formatVersion: number
    versionId: string
    name: string
    summary: string
    files: ModrinthIndexFile[]
    dependencies: {
        minecraft: string
        'fabric-loader'?: string
        [key: string]: string | undefined
    }
}

export interface ServerModrinthMapping {
    [path: string]: ModrinthIndexFile
}