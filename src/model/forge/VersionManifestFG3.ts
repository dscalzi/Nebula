export interface VersionManifestFG3 {

    id: string
    time: string
    releaseTime: string
    type: string
    mainClass: string
    inheritsFrom: string
    logging: Record<string, unknown>
    arguments: {
        game: string[]
    }
    libraries: Array<{
        name: string
        downloads: {
            artifact: {
                path: string
                url: string
                sha1: string
                size: number
            }
        }
    }>

}
